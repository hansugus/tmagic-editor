<template>
  <div class="m-editor-sidebar" v-if="data.type === 'tabs' && data.items.length">
    <div class="m-editor-sidebar-header">
      <div
        class="m-editor-sidebar-header-item"
        v-for="(config, index) in sideBarItems"
        v-show="!floatBoxStates?.get(config.$key)?.status"
        draggable="true"
        :key="config.$key ?? index"
        :class="{ 'is-active': activeTabName === config.text }"
        @click="activeTabName = config.text || `${index}`"
        @dragstart="dragstartHandler"
        @dragend="dragendHandler(config.$key, $event)"
      >
        <MIcon v-if="config.icon" :icon="config.icon"></MIcon>
        <div v-if="config.text" class="magic-editor-tab-panel-title">{{ config.text }}</div>
      </div>
    </div>
    <div
      class="m-editor-sidebar-content"
      v-for="(config, index) in sideBarItems"
      :key="config.$key ?? index"
      v-show="activeTabName === config.text"
    >
      <component
        v-if="config && !floatBoxStates?.get(config.$key)?.status"
        :is="config.component"
        v-bind="config.props || {}"
        v-on="config?.listeners || {}"
      >
        <template
          #component-list-panel-header
          v-if="config.$key === 'component-list' || config.slots?.componentListPanelHeader"
        >
          <slot v-if="config.$key === 'component-list'" name="component-list-panel-header"></slot>
          <component v-else-if="config.slots?.componentListPanelHeader" :is="config.slots.componentListPanelHeader" />
        </template>

        <template
          #component-list-item="{ component }"
          v-if="config.$key === 'component-list' || config.slots?.componentListItem"
        >
          <slot v-if="config.$key === 'component-list'" name="component-list-item" :component="component"></slot>
          <component
            v-else-if="config.slots?.componentListItem"
            :is="config.slots.componentListItem"
            :component="component"
          />
        </template>

        <template #layer-panel-header v-if="config.$key === 'layer' || config.slots?.layerPanelHeader">
          <slot v-if="config.$key === 'layer'" name="layer-panel-header"></slot>
          <component v-else-if="config.slots?.layerPanelHeader" :is="config.slots.layerPanelHeader" />
        </template>

        <template #code-block-panel-header v-if="config.$key === 'code-block' || config.slots?.codeBlockPanelHeader">
          <slot v-if="config.$key === 'code-block'" name="code-block-panel-header"></slot>
          <component v-else-if="config.slots?.codeBlockPanelHeader" :is="config.slots.codeBlockPanelHeader" />
        </template>

        <template
          #code-block-panel-tool="{ id, data }"
          v-if="config.$key === 'code-block' || config.slots?.codeBlockPanelTool"
        >
          <slot v-if="config.$key === 'code-block'" name="code-block-panel-tool" :id="id" :data="data"></slot>
          <component v-else-if="config.slots?.codeBlockPanelTool" :is="config.slots.codeBlockPanelTool" />
        </template>

        <template
          #layer-node-content="{ data: nodeData }"
          v-if="config.$key === 'layer' || config.slots?.layerNodeContent"
        >
          <slot v-if="config.$key === 'layer'" name="layer-node-content" :data="nodeData"></slot>
          <component v-else-if="config.slots?.layerNodeContent" :is="config.slots.layerNodeContent" :data="nodeData" />
        </template>

        <template #layer-node-label="{ data: nodeData }" v-if="config.$key === 'layer' || config.slots?.layerNodeLabel">
          <slot v-if="config.$key === 'layer'" name="layer-node-label" :data="nodeData"></slot>
          <component v-else-if="config.slots?.layerNodeLabel" :is="config.slots.layerNodeTool" :data="nodeData" />
        </template>

        <template #layer-node-tool="{ data: nodeData }" v-if="config.$key === 'layer' || config.slots?.layerNodeTool">
          <slot v-if="config.$key === 'layer'" name="layer-node-tool" :data="nodeData"></slot>
          <component v-else-if="config.slots?.layerNodeTool" :is="config.slots.layerNodeTool" :data="nodeData" />
        </template>

        <template
          #data-source-panel-tool="{ data }"
          v-if="config.$key === 'data-source' || config.slots?.codeBlockPanelTool"
        >
          <slot v-if="config.$key === 'data-source'" name="data-source-panel-tool" :data="data"></slot>
          <component v-else-if="config.slots?.DataSourcePanelTool" :is="config.slots.DataSourcePanelTool" />
        </template>
      </component>
    </div>
  </div>

  <Teleport to="body">
    <div class="m-editor-float-box-list">
      <div
        v-for="(config, index) in sideBarItems"
        :key="config.$key ?? index"
        ref="floatBox"
        :class="['m-editor-float-box', `m-editor-float-box-${config.$key}`]"
        :style="{
          left: `${floatBoxStates?.get(config.$key)?.left}px`,
          top: `${floatBoxStates?.get(config.$key)?.top}px`,
          zIndex: floatBoxStates?.get(config.$key)?.zIndex,
        }"
        v-show="floatBoxStates?.get(config.$key)?.status"
      >
        <div
          :class="['m-editor-float-box-header', `m-editor-float-box-header-${config.$key}`]"
          @click="showFloatBox(config.$key)"
        >
          <div>{{ config.text }}</div>
          <MIcon class="m-editor-float-box-close" :icon="Close" @click.stop="closeFloatBox(config.$key)"></MIcon>
        </div>
        <div class="m-editor-float-box-body">
          <component
            v-if="config && floatBoxStates?.get(config.$key)?.status"
            :is="config.boxComponentConfig?.component || config.component"
            v-bind="config.boxComponentConfig?.props || config.props || {}"
            v-on="config?.listeners || {}"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { Close, Coin, EditPen, Goods, List } from '@element-plus/icons-vue';

import MIcon from '@editor/components/Icon.vue';
import { useFloatBox } from '@editor/hooks/use-float-box';
import type {
  MenuButton,
  MenuComponent,
  Services,
  SideBarData,
  SidebarSlots,
  SideComponent,
  SideItem,
} from '@editor/type';

import CodeBlockListPanel from './code-block/CodeBlockListPanel.vue';
import DataSourceListPanel from './data-source/DataSourceListPanel.vue';
import LayerPanel from './layer/LayerPanel.vue';
import ComponentListPanel from './ComponentListPanel.vue';

defineSlots<SidebarSlots>();

defineOptions({
  name: 'MEditorSidebar',
});

const props = withDefaults(
  defineProps<{
    data: SideBarData;
    layerContentMenu: (MenuButton | MenuComponent)[];
    customContentMenu?: (menus: (MenuButton | MenuComponent)[], type: string) => (MenuButton | MenuComponent)[];
  }>(),
  {
    data: () => ({ type: 'tabs', status: '组件', items: ['component-list', 'layer', 'code-block', 'data-source'] }),
  },
);

const services = inject<Services>('services');

const activeTabName = ref(props.data?.status);

const getItemConfig = (data: SideItem): SideComponent => {
  const map: Record<string, SideComponent> = {
    'component-list': {
      $key: 'component-list',
      type: 'component',
      icon: Goods,
      text: '组件',
      component: ComponentListPanel,
      slots: {},
    },
    layer: {
      $key: 'layer',
      type: 'component',
      icon: List,
      text: '已选组件',
      props: {
        layerContentMenu: props.layerContentMenu,
        customContentMenu: props.customContentMenu,
      },
      component: LayerPanel,
      slots: {},
    },
    'code-block': {
      $key: 'code-block',
      type: 'component',
      icon: EditPen,
      text: '代码编辑',
      component: CodeBlockListPanel,
      slots: {},
      boxComponentConfig: {
        props: {
          slideType: 'box',
        },
      },
    },
    'data-source': {
      $key: 'data-source',
      type: 'component',
      icon: Coin,
      text: '数据源',
      component: DataSourceListPanel,
      slots: {},
      boxComponentConfig: {
        props: {
          slideType: 'box',
        },
      },
    },
  };

  return typeof data === 'string' ? map[data] : data;
};

const sideBarItems = computed(() => props.data.items.map((item) => getItemConfig(item)));

watch(
  () => props.data.status,
  (status) => {
    activeTabName.value = status || '0';
  },
);

const slideKeys = computed(() => sideBarItems.value.map((sideBarItem) => sideBarItem.$key));

const { showFloatBox, closeFloatBox, dragstartHandler, dragendHandler, floatBoxStates, floatBox, showingBoxKeys } =
  useFloatBox(slideKeys);

watch(
  () => showingBoxKeys.value.length,
  () => {
    const isActiveTabShow = showingBoxKeys.value.some(
      (key) => activeTabName.value === sideBarItems.value.find((v) => v.$key === key)?.text,
    );
    if (!isActiveTabShow && activeTabName.value) return;
    const nextSlideBarItem = sideBarItems.value.find((sideBarItem) => !showingBoxKeys.value.includes(sideBarItem.$key));
    if (!nextSlideBarItem) {
      activeTabName.value = '';
      services?.uiService.set('hideSlideBar', true);
      return;
    }
    services?.uiService.set('hideSlideBar', false);
    activeTabName.value = nextSlideBarItem?.text;
  },
);

defineExpose({
  activeTabName,
});
</script>
