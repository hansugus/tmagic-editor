/*
 * Tencent is pleased to support the open source community by making TMagicEditor available.
 *
 * Copyright (C) 2023 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { reactive } from 'vue';
import { cloneDeep, mergeWith } from 'lodash-es';

import { DepTargetType } from '@tmagic/dep';
import type { FormConfig } from '@tmagic/form';
import type { Id, MComponent, MNode } from '@tmagic/schema';
import { getValueByKeyPath, guid, setValueByKeyPath, toLine } from '@tmagic/utils';

import depService from '@editor/services/dep';
import editorService from '@editor/services/editor';
import type { PropsState } from '@editor/type';
import { fillConfig } from '@editor/utils/props';

import BaseService from './BaseService';

class Props extends BaseService {
  private state = reactive<PropsState>({
    propsConfigMap: {},
    propsValueMap: {},
    relateIdMap: {},
  });

  constructor() {
    super([
      { name: 'setPropsConfig', isAsync: true },
      { name: 'getPropsConfig', isAsync: true },
      { name: 'setPropsValue', isAsync: true },
      { name: 'getPropsValue', isAsync: true },
      { name: 'createId', isAsync: false },
      { name: 'setNewItemId', isAsync: true },
      { name: 'fillConfig', isAsync: true },
      { name: 'getDefaultPropsValue', isAsync: true },
    ]);
  }

  public setPropsConfigs(configs: Record<string, FormConfig>) {
    Object.keys(configs).forEach((type: string) => {
      this.setPropsConfig(toLine(type), configs[type]);
    });
    this.emit('props-configs-change');
  }

  public async fillConfig(config: FormConfig) {
    return fillConfig(config);
  }

  /**
   * 为指定类型组件设置组件属性表单配置
   * @param type 组件类型
   * @param config 组件属性表单配置
   */
  public async setPropsConfig(type: string, config: FormConfig) {
    this.state.propsConfigMap[type] = await this.fillConfig(Array.isArray(config) ? config : [config]);
  }

  /**
   * 获取指点类型的组件属性表单配置
   * @param type 组件类型
   * @returns 组件属性表单配置
   */
  public async getPropsConfig(type: string): Promise<FormConfig> {
    if (type === 'area') {
      return await this.getPropsConfig('button');
    }

    return cloneDeep(this.state.propsConfigMap[type] || (await this.fillConfig([])));
  }

  public setPropsValues(values: Record<string, Partial<MNode>>) {
    Object.keys(values).forEach((type: string) => {
      this.setPropsValue(toLine(type), values[type]);
    });
  }

  /**
   * 为指点类型组件设置组件初始值
   * @param type 组件类型
   * @param value 组件初始值
   */
  public async setPropsValue(type: string, value: Partial<MNode>) {
    this.state.propsValueMap[type] = value;
  }

  /**
   * 获取指定类型的组件初始值
   * @param type 组件类型
   * @returns 组件初始值
   */
  public async getPropsValue(type: string, { inputEvent, ...defaultValue }: Record<string, any> = {}) {
    if (type === 'area') {
      const value = (await this.getPropsValue('button')) as MComponent;
      value.className = 'action-area';
      value.text = '';
      if (value.style) {
        value.style.backgroundColor = 'rgba(255, 255, 255, 0)';
      }
      return value;
    }

    const [id, defaultPropsValue, data] = await Promise.all([
      this.createId(type),
      this.getDefaultPropsValue(type),
      this.setNewItemId(
        cloneDeep({
          type,
          ...defaultValue,
        } as any),
      ),
    ]);

    return {
      id,
      ...defaultPropsValue,
      ...mergeWith({}, cloneDeep(this.state.propsValueMap[type] || {}), data),
    };
  }

  public async createId(type: string | number): Promise<string> {
    return `${type}_${guid()}`;
  }

  /**
   * 将组件与组件的子元素配置中的id都设置成一个新的ID
   * 如果没有相同ID并且force为false则保持不变
   * @param {Object} config 组件配置
   * @param {Boolean} force 是否强制设置新的ID
   */
  /* eslint no-param-reassign: ["error", { "props": false }] */
  public async setNewItemId(config: MNode, force = true) {
    if (force || editorService.getNodeById(config.id)) {
      const newId = await this.createId(config.type || 'component');
      this.setRelateId(config.id, newId);
      config.id = newId;
    }

    if (config.items && Array.isArray(config.items)) {
      for (const item of config.items) {
        await this.setNewItemId(item);
      }
    }

    return config;
  }

  /**
   * 获取默认属性配置
   * @param type 组件类型
   * @returns Object
   */
  public async getDefaultPropsValue(type: string) {
    return ['page', 'container'].includes(type)
      ? {
          type,
          layout: 'absolute',
          style: {},
          name: type,
          items: [],
        }
      : {
          type,
          style: {},
          name: type,
        };
  }

  public resetState() {
    this.state.propsConfigMap = {};
    this.state.propsValueMap = {};
  }

  /**
   * 替换关联ID
   * @param originConfigs 原组件配置
   * @param targetConfigs 待替换的组件配置
   */
  public replaceRelateId(originConfigs: MNode[], targetConfigs: MNode[]) {
    const relateIdMap = this.getRelateIdMap();
    if (Object.keys(relateIdMap).length === 0) return;

    const target = depService.getTarget(DepTargetType.RELATED_COMP_WHEN_COPY, DepTargetType.RELATED_COMP_WHEN_COPY);
    if (!target) return;

    originConfigs.forEach((config: MNode) => {
      const newId = relateIdMap[config.id];
      const targetConfig = targetConfigs.find((targetConfig) => targetConfig.id === newId);

      if (!targetConfig) return;

      target.deps[config.id]?.keys?.forEach((fullKey) => {
        const relateOriginId = getValueByKeyPath(fullKey, config);
        const relateTargetId = relateIdMap[relateOriginId];
        if (!relateTargetId) return;

        setValueByKeyPath(fullKey, relateTargetId, targetConfig);
      });
    });
  }

  /**
   * 清除setNewItemId前后映射关系
   */
  public clearRelateId() {
    this.state.relateIdMap = {};
  }

  public destroy() {
    this.resetState();
    this.removeAllListeners();
    this.removeAllPlugins();
  }

  /**
   * 获取setNewItemId前后映射关系
   * @param oldId 原组件ID
   * @returns 新旧ID映射
   */
  private getRelateIdMap() {
    return this.state.relateIdMap;
  }

  /**
   * 记录setNewItemId前后映射关系
   * @param oldId 原组件ID
   * @param newId 分配的新ID
   */
  private setRelateId(oldId: Id, newId: Id) {
    this.state.relateIdMap[oldId] = newId;
  }
}

export type PropsService = Props;

export default new Props();
