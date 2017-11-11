import test from 'tape'

import { 
  clearSchemaDefault,
  processDiff
} from './cn-batch-forms.service'

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
        far: {
          type: 'string',
          default: 'test duplicate key string'
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
        type: 'object',
        properties: {
          raf: {
            type: 'string',
            default: 'simmons'
          },
          gat: {
            type: 'number',
            default: 9
          }
        }
      }
    }
  }
}


test('clearSchemaDefault', t => {
  const service = { defaults: {} }
  const schema = _.cloneDeep(schemaTpl)
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
          far: {
            type: 'string',
            default: undefined
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
          type: 'object',
          properties: {
            raf: {
              type: 'string',
              default: undefined
            },
            gat: {
              type: 'number',
              default: undefined
            }
          }
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

test('processDiff', t => {
  const service = { 
    defaults: {},
    schema: {
      diff: {
        schema: _.cloneDeep(schemaTpl.properties)
      },
      batchConfig: {
        links: [
          [ "far[].raf", "far[].gat" ]
        ],
        hardLinks: [
          [ "foo.bar", "foo.baz", "foo.zed" ]
        ]
      },
      params: {
        updateSchema: "foo.bar"
      }
    }
  }
  const expected = {
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
        far: {
          type: 'string',
          default: undefined
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
        type: 'object',
        properties: {
          raf: {
            type: 'string',
            default: undefined
          },
          gat: {
            type: 'number',
            default: undefined
          }
        }
      }
    }
  }

  processDiff(service)(service.schema)
  t.deepEqual(
    service.schema.diff.schema,
    expected
  )

  t.end()
  
})

