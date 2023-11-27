import { useApiClientStore } from '@scalar/api-client'
import { computed, reactive, ref, watch } from 'vue'

import {
  getHeadingId,
  getHeadingsFromMarkdown,
  getLowestHeadingLevel,
  getModelSectionId,
  getOperationSectionId,
  getTagSectionId,
  hasModels,
  showItemInClient,
} from '../helpers'
import { useTemplateStore } from '../stores/template'
import type { Spec, Tag, TransformedOperation } from '../types'

export type SidebarIdVisibility = Record<string, boolean>

const sidebarIdVisibility = reactive<SidebarIdVisibility>({})

function setItemIdVisibility(id: string, visible: boolean) {
  sidebarIdVisibility[id] = visible
}

// Expand/collapse sidebar items
const { setCollapsedSidebarItem } = useTemplateStore()

const { state } = useApiClientStore()

const moreThanOneDefaultTag = (tags?: Tag[]) =>
  tags?.length !== 1 || tags[0].name !== 'default' || tags[0].description !== ''

const isVisible = (id: string) => sidebarIdVisibility[id] ?? false

type SidebarEntry = {
  id: string
  title: string
  type: 'Page' | 'Folder'
  children?: SidebarEntry[]
  select?: () => void
  httpVerb?: string
}

const parsedSpec = ref<Spec | undefined>(undefined)

const headings = ref<any[]>([])

const updateHeadings = async (description: string) => {
  const newHeadings = await getHeadingsFromMarkdown(description)
  const lowestLevel = getLowestHeadingLevel(newHeadings)

  return newHeadings.filter((heading) => heading.depth === lowestLevel)
}

export function useNavigation(options?: { parsedSpec: Spec }) {
  if (options?.parsedSpec) {
    parsedSpec.value = options.parsedSpec

    // Open the first tag section by default
    watch(
      parsedSpec,
      () => {
        const firstTag = parsedSpec.value?.tags?.[0]

        if (firstTag) {
          setCollapsedSidebarItem(getTagSectionId(firstTag), true)
        }
      },
      { immediate: true, deep: true },
    )

    // Watch the spec description for headings
    watch(
      () => parsedSpec.value?.info?.description,
      async () => {
        const description = parsedSpec.value?.info?.description

        if (!description) {
          return []
        }

        return (headings.value = await updateHeadings(description))
      },
    )
  }

  const items = computed((): SidebarEntry[] => {
    // Introduction
    const headingEntries: SidebarEntry[] = headings.value.map((heading) => {
      return {
        id: getHeadingId(heading),
        title: heading.value.toUpperCase(),
        type: 'Page',
      }
    })

    // Tags & Operations
    const firstTag = parsedSpec.value?.tags?.[0]

    const operationEntries: SidebarEntry[] | undefined =
      firstTag &&
      moreThanOneDefaultTag(parsedSpec.value?.tags) &&
      firstTag.operations?.length > 0
        ? parsedSpec.value?.tags?.map((tag: Tag) => {
            return {
              id: getTagSectionId(tag),
              title: tag.name.toUpperCase(),
              type: 'Folder',
              children: tag.operations?.map(
                (operation: TransformedOperation) => {
                  return {
                    id: getOperationSectionId(operation, tag),
                    title: operation.name,
                    type: 'Page',
                    httpVerb: operation.httpVerb,
                    select: () => {
                      if (state.showApiClient) {
                        showItemInClient(operation)
                      }
                    },
                  }
                },
              ),
            }
          })
        : firstTag?.operations?.map((operation) => {
            return {
              id: getOperationSectionId(operation, firstTag),
              title: operation.name,
              type: 'Page',
              httpVerb: operation.httpVerb,
              select: () => {
                if (state.showApiClient) {
                  showItemInClient(operation)
                }
              },
            }
          })

    // Models
    const modelEntries: SidebarEntry[] = hasModels(parsedSpec.value)
      ? [
          {
            id: getModelSectionId(),
            title: 'MODELS',
            type: 'Folder',
            children: Object.keys(
              parsedSpec.value?.components?.schemas ?? {},
            ).map((name) => {
              return {
                id: getModelSectionId(name),
                title: name,
                type: 'Page',
              }
            }),
          },
        ]
      : []

    return [...headingEntries, ...(operationEntries ?? []), ...modelEntries]
  })

  const activeItemId = computed(() => {
    const flattenedItems = items.value.reduce((acc, item) => {
      acc.push(item)

      if (item.children) {
        acc.push(...item.children)
      }

      return acc
    }, [] as SidebarEntry[])

    return flattenedItems.find((item) => isVisible(item.id))?.id ?? null
  })

  watch(activeItemId, (id) => {
    if (id) {
      const newUrl = `${window.location.origin}${window.location.pathname}#${id}`
      window.history.replaceState({}, '', newUrl)
    }
  })

  return {
    items,
    activeItemId,
    setItemIdVisibility,
  }
}
