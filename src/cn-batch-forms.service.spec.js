import test from 'tape'

import { clearSchemaDefault } from './cn-batch-forms.service'

const schemaTpl = {
  type: 'object',
  properties: {
    foo: {
      type: 'object',
      properties: {
        bar: {
          default: 12,
          type: 'integer'
        },
        baz: {
          type: 'array',
          items: {
            type: 'string',
            default: 'default string'
          }
        },
        zed: {
          type: 'array',
          items: {
            properties: {
              jam: {
                type: 'integer',
                default: 42
              }
            },
            type: 'object'
          }
        }
      }
    },
    far: {
      type: 'array',
      items: {
        type: 'string',
        default: 'Mike'
      }
    }
  }
}


test('clearSchemaDefault', t => {
  const service = { defaults: {} }
  const schema = { ...schemaTpl }
  const expected = {
    type: 'object',
    properties: {
      foo: {
        type: 'object',
        properties: {
          bar: {
            default: undefined,
            type: 'integer'
          },
          baz: {
            type: 'array',
            items: {
              type: 'string',
              default: undefined
            }
          },
          zed: {
            type: 'array',
            items: {
              properties: {
                jam: {
                  type: 'integer',
                  default: undefined
                }
              },
              type: 'object'
            }
          }
        }
      },
      far: {
        type: 'array',
        items: {
          type: 'string',
          default: undefined
        }
      }
    }
  }

  clearSchemaDefault(service, schema); 
  t.deepEqual(
    schema,
    expected
  )

  t.end()
})

