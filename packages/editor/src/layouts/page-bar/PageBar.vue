<template>
  <div class="m-editor-page-bar-tabs">
    <SwitchTypeButton v-if="!disabledPageFragment" v-model="active" />

    <PageBarScrollContainer :type="active">
      <template #prepend>
        <AddButton :type="active"></AddButton>
      </template>

      <div
        v-for="item in list"
        class="m-editor-page-bar-item"
        :key="item.id"
        :class="{ active: page?.id === item.id }"
        @click="switchPage(item.id)"
      >
        <div class="m-editor-page-bar-title">
          <slot name="page-bar-title" :page="item">
            <span :title="item.name">{{ item.name || item.id }}</span>
          </slot>
        </div>

        <TMagicPopover popper-class="page-bar-popover" placement="top" :width="160" trigger="hover">
          <div>
            <slot name="page-bar-popover" :page="item">
              <ToolButton
                :data="{
                  type: 'button',
                  text: '复制',
                  icon: DocumentCopy,
                  handler: () => copy(item),
                }"
              ></ToolButton>
              <ToolButton
                :data="{
                  type: 'button',
                  text: '删除',
                  icon: Delete,
                  handler: () => remove(item),
                }"
              ></ToolButton>
            </slot>
          </div>
          <template #reference>
            <TMagicIcon class="m-editor-page-bar-menu-icon">
              <CaretBottom></CaretBottom>
            </TMagicIcon>
          </template>
        </TMagicPopover>
      </div>
    </PageBarScrollContainer>
  </div>
</template>

<script lang="ts" setup>
import { computed, inject, ref, watch } from 'vue';
import { CaretBottom, Delete, DocumentCopy } from '@element-plus/icons-vue';

import { TMagicIcon, TMagicPopover } from '@tmagic/design';
import { Id, type MPage, type MPageFragment, NodeType } from '@tmagic/schema';
import { isPage, isPageFragment } from '@tmagic/utils';

import ToolButton from '@editor/components/ToolButton.vue';
import type { Services } from '@editor/type';
import { getPageFragmentList, getPageList } from '@editor/utils';

import AddButton from './AddButton.vue';
import PageBarScrollContainer from './PageBarScrollContainer.vue';
import SwitchTypeButton from './SwitchTypeButton.vue';

defineOptions({
  name: 'MEditorPageBar',
});

defineProps<{
  disabledPageFragment: boolean;
}>();

const active = ref<NodeType.PAGE | NodeType.PAGE_FRAGMENT>(NodeType.PAGE);

const services = inject<Services>('services');
const editorService = services?.editorService;

const root = computed(() => editorService?.get('root'));
const page = computed(() => editorService?.get('page'));
const pageList = computed(() => getPageList(root.value));
const pageFragmentList = computed(() => getPageFragmentList(root.value));

const list = computed(() => (active.value === NodeType.PAGE ? pageList.value : pageFragmentList.value));

const activePage = ref<Id>('');
const activePageFragment = ref<Id>('');

watch(
  page,
  (page) => {
    if (!page) {
      if (active.value === NodeType.PAGE) {
        activePage.value = '';
      }
      if (active.value === NodeType.PAGE_FRAGMENT) {
        activePageFragment.value = '';
      }
      return;
    }

    if (isPage(page)) {
      activePage.value = page?.id;
      if (active.value !== NodeType.PAGE) {
        active.value = NodeType.PAGE;
      }
    } else if (isPageFragment(page)) {
      activePageFragment.value = page?.id;
      if (active.value !== NodeType.PAGE_FRAGMENT) {
        active.value = NodeType.PAGE_FRAGMENT;
      }
    }
  },
  {
    immediate: true,
  },
);

watch(active, (active) => {
  if (active === NodeType.PAGE) {
    if (!activePage.value) {
      editorService?.selectRoot();
      return;
    }
    switchPage(activePage.value);
    return;
  }

  if (active === NodeType.PAGE_FRAGMENT) {
    if (!activePageFragment.value) {
      editorService?.selectRoot();
      return;
    }
    switchPage(activePageFragment.value);
  }
});

const switchPage = (id: Id) => {
  editorService?.select(id);
};

const copy = (node: MPage | MPageFragment) => {
  node && editorService?.copy(node);
  editorService?.paste({
    left: 0,
    top: 0,
  });
};

const remove = (node: MPage | MPageFragment) => {
  editorService?.remove(node);
};
</script>
