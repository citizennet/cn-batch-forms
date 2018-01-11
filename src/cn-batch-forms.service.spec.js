import test from 'tape'

import {
  clearSchemaDefault,
  processDiff,
  setValue
} from './cn-batch-forms.service'

const schemaTpl = {
  type: 'object',
  properties: {
    foo: {
      type: 'object',
      properties: {
        bar: { default: 12, type: 'integer' },
        baz: {
          type: 'array',
          items: { type: 'string', default: 'default string' }
        },
        far: { type: 'string', default: 'test duplicate key string' },
        zed: {
          type: 'array',
          items: {
            properties: {
              jam: { type: 'integer', default: 42 }
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
          raf: { type: 'string', default: 'simmons' },
          gat: { type: 'number', default: 9 }
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
        bar: { default: undefined, type: 'integer' },
        baz: {
          type: 'array',
          items: { type: 'string', default: undefined }
        },
        far: { type: 'string', default: undefined },
        zed: {
          type: 'array',
          items: {
            properties: {
              jam: { type: 'integer', default: 42 }
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
          raf: { type: 'string', default: 'simmons' },
          gat: { type: 'number', default: 9 }
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

function modelFactory(val) {
  return {
    val,
    set(val) { this.val = val },
    get(val) { return this.val },
    path() { return { key: 'val' } }
  }
}

const setValue_ = setValue({
  parseExpression(key, obj) {
    return {
      get() {
        return obj[key]
      }
    }
  }
})

test('setValue', t => {
  test('replace', t => {
    const update = modelFactory()
    const original = modelFactory()
    setValue_('ice cream', update, original, 'replace')
    t.equal(update.get(), 'ice cream')
    t.end()
  })

  test('append str', t => {
    const update = modelFactory()
    const original = modelFactory('i like')
    setValue_(' ice cream ', update, original, 'append')
    t.equal(update.get(), 'i like ice cream')
    setValue_(undefined, update, original, 'append');
    t.equal(update.get(), 'i like');
    t.end()
  })

  test('append arr', t => {
    const update = modelFactory()
    const original = modelFactory(['i like'])
    setValue_(['ice cream'], update, original, 'append')
    t.deepEqual(update.get(), ['i like', 'ice cream'])
    setValue_(['i like', 'ice cream'], update, original, 'append')
    t.deepEqual(update.get(), ['i like', 'ice cream'])
    t.end()
  })

  test('prepend str', t => {
    const update = modelFactory()
    const original = modelFactory('i like')
    setValue_(' ice cream, ', update, original, 'prepend')
    t.equal(update.get(), 'ice cream, i like')
    setValue_(undefined, update, original, 'prepend');
    t.equal(update.get(), 'i like');
    t.end()
  })

  test('prepend arr', t => {
    const update = modelFactory()
    const original = modelFactory(['i like'])
    setValue_(['ice cream'], update, original, 'prepend')
    t.deepEqual(update.get(), ['ice cream', 'i like'])
    setValue_(['i like', 'ice cream'], update, original, 'prepend')
    t.deepEqual(update.get(), ['i like', 'ice cream'])
    t.end()
  })

  test('strReplace', t => {
    const update = modelFactory()
    const original = modelFactory('i like donuts')
    setValue_('', update, original, 'stringReplace', {
      __replace_val: 'donuts',
      __with_val: 'ice cream'
    })
    t.equal(update.get(), 'i like ice cream')
    setValue_('', update, original, 'stringReplace', {
      __replace_val: 'donuts',
    })
    t.equal(update.get(), 'i like')
    setValue_('', update, original, 'stringReplace', {
      __with_val: 'ice cream',
    })
    t.equal(update.get(), 'i like donuts')
    t.end()
  })

  t.end()
})
