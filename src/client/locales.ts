/**
 * locales.ts — i18n dictionaries for the tools-manager configuration card.
 *
 * @module dsh-tools-manager/client/locales
 */

export const NS = 'tools-manager' as const

export type ToolsManagerKey =
  | 'title'
  | 'intro'
  | 'pluginGroup'
  | 'unknownPlugin'
  | 'baselinePlugin'
  | 'noTools'
  | 'loading'
  | 'loadFailed'
  | 'disable'
  | 'enable'
  | 'disabled'
  | 'enabled'
  | 'expand'
  | 'collapse'
  | 'namespaceUnavailable'
  | 'retry'

export const zh: Record<ToolsManagerKey, string> = {
  title: '工具管理',
  intro: '按来源插件分组列出全部已注册工具，支持全局启停单个工具。',
  pluginGroup: '插件',
  unknownPlugin: '（未知来源）',
  baselinePlugin: '（启动前注册）',
  noTools: '当前没有已注册的工具。',
  loading: '加载中…',
  loadFailed: '加载工具列表失败。',
  disable: '禁用',
  enable: '启用',
  disabled: '已禁用',
  enabled: '已启用',
  expand: '展开',
  collapse: '收起',
  namespaceUnavailable: '工具管理通道当前不可用。请稍后重试。',
  retry: '重试',
}

export const en: Record<ToolsManagerKey, string> = {
  title: 'Tools Manager',
  intro: 'Lists all registered tools grouped by source plugin. Toggle a tool to globally enable/disable it.',
  pluginGroup: 'Plugin',
  unknownPlugin: '(unknown source)',
  baselinePlugin: '(registered at startup)',
  noTools: 'No tools are currently registered.',
  loading: 'Loading…',
  loadFailed: 'Failed to load the tool list.',
  disable: 'Disable',
  enable: 'Enable',
  disabled: 'Disabled',
  enabled: 'Enabled',
  expand: 'Show',
  collapse: 'Hide',
  namespaceUnavailable: 'The tools-manager channel is unavailable. Please retry later.',
  retry: 'Retry',
}
