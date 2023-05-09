import './index.scss'

import { AllTypes } from '@zodui/core'
import { classnames, inlineMarkdown, isWhatType, merge } from '@zodui/core/utils'
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import type { Schema as ZodSchema } from 'zod'

import { usePlugins } from '../../hooks'
import common from '../../plugins/common'
import type { ItemRef } from './item'
import { Item } from './item'

export interface ListRef {
  verify: () => Promise<any>
}

export interface ListProps {
  prefix?: string
  model: ZodSchema
  disabled?: boolean
  value?: any
  defaultValue?: any
  onChange?: (value: any) => (void | Promise<void>)
}

const prefix = 'zodui-schema'

export const List = forwardRef<ListRef, ListProps>((props, ref) => {
  const { inited } = usePlugins(common)

  const {
    model,
    value,
    defaultValue,
    onChange,
    disabled
  } = props
  const valueRef = useRef(value ?? defaultValue ?? {})
  const changeValue = useCallback((v: any) => {
    valueRef.current = v
    onChange?.(v)
  }, [onChange])

  const itemRefs = useRef<Record<string, ItemRef>>({})

  useImperativeHandle(ref, () => ({
    async verify() {
      const promises = Object.entries(itemRefs.current).map(([_, ref]) => {
        if (!ref) return Promise.resolve()
        return ref.verify()
      })
      await Promise.all(promises)
      return valueRef.current
    }
  }), [])

  if (!inited) return null

  if (isWhatType(model, AllTypes.ZodIntersection)) {
    // TODO resolve ref merge
    return <>
      <List prefix='intersect::left'
            disabled={disabled}
            model={model._def.left}
            value={valueRef.current}
            onChange={async v => changeValue(merge(valueRef.current, v))}
      />
      <List prefix='intersect::right'
            disabled={disabled}
            model={model._def.right}
            value={valueRef.current}
            onChange={async v => changeValue(merge(valueRef.current, v))}
      />
    </>
  }

  return <div className={prefix}>
    <div className={`${prefix}__header`}>
      {model._def.label && <h2 className={classnames(`${prefix}__label`, {
        // @ts-ignore
        'is-optional': model._def.typeName === AllTypes.ZodOptional
      })}>
        {model._def.label}
      </h2>}
      {model._def.description
        && <pre
          className={`${prefix}__desc inline-md`}
          dangerouslySetInnerHTML={{ __html: inlineMarkdown(model._def.description) }}
        />}
    </div>
    {isWhatType(model, AllTypes.ZodObject)
      ? Object.entries(model._def.shape()).map(([key, value]) => <Item
        ref={ele => itemRefs.current[key] = ele}
        key={key}
        uKey={`${props.prefix || ''}.${key}`}
        meta={{
          label: value._def.label || key,
          description: value._def.description
        }}
        model={value}
        disabled={disabled}
        onChange={async v => changeValue({ ...valueRef.current, [key]: v })}
      />)
      : <Item
        ref={ele => itemRefs.current['single'] = ele}
        uKey='single'
        meta={{
          label: model._label || model._def?.description || model.type,
          description: model._def.description
        }}
        model={model}
        disabled={disabled}
        value={valueRef.current}
        onChange={changeValue}
      />}
  </div>
})

List.displayName = 'Schema'

// TODO export Schema with Item
// Schema.Item = Item