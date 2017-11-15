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
  const service = {
    defaults: {},
    schema: {
      schema: _.cloneDeep(schemaTpl)
    }
  }
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

  clearSchemaDefault(service, service.schema.schema);
  t.deepEqual(
    service.schema.schema,
    expected
  )

  t.end()
})

test('processDiff', t => {
  const service = {
    defaults: {},
    schema: {
      schema: _.cloneDeep(schemaTpl),
      batchConfig: {
        links: [
          [ "far[].raf", "far[].gat" ]
        ],
        hardLinks: [
          [ "foo.bar", "foo.baz", "foo.zed" ]
        ]
      }
    }
  }
  const payload = {
    diff: {
      schema: _.cloneDeep(schemaTpl.properties)
    },
    params: {
      updateSchema: "foo.bar"
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

  processDiff(service)(payload)
  t.deepEqual(
    service.schema.schema.properties,
    expected
  )

  t.end()
})

test('processDiffSimilarFields', t => {
  const service = {
    defaults: {},
    schema: {
      schema: _.cloneDeep(schemaTpl),
      batchConfig: {
        links: [
          [ "far[].raf", "far[].gat" ]
        ],
        hardLinks: [
          [ "foo.bar", "foo.baz", "foo.far" ]
        ]
      }
    }
  }
  const payload = {
    diff: {
      schema: _.cloneDeep(schemaTpl.properties)
    },
    params: {
      updateSchema: "foo.far"
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
          default: 'test duplicate key string'
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

  processDiff(service)(payload)
  t.deepEqual(
    service.schema.schema.properties,
    expected
  )

  t.end()
})

test('processDiffSimilarFieldsAgain', t => {
  const service = {
    defaults: {},
    schema: {
      schema: _.cloneDeep(schemaTpl),
      batchConfig: {
        links: [
          [ "far", "foo.zed" ]
        ],
        hardLinks: [
          [ "foo.bar", "foo.baz", "foo.far" ]
        ]
      },
    }
  }
  const payload = {
    diff: {
      schema: _.cloneDeep(schemaTpl.properties)
    },
    params: {
      updateSchema: "far"
    }
  }
  const expected = {
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
            default: undefined,
          }
        },
        far: {
          type: 'string',
          default: undefined,
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

  processDiff(service)(payload)
  t.deepEqual(
    service.schema.schema.properties,
    expected
  )

  t.end()
})
