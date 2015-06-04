import fs from 'fs'

// variables in ES6 imports. how?
const srcPath = '../../../' + SRC_DIR
const config = require(srcPath + '/lib/config')
const defaults = require(srcPath + '/lib/config/defaults')
const project = require(srcPath + '/lib/project')
const utils = require(srcPath + '/lib/utils')

describe('config/index', () => {
  before(cleanup)
  afterEach(cleanup)

  describe('configName', () => {
    it('returns the test config file name', done => {
      assert.equal(config.configName, '.planb.json.test')
      done()
    })
  })

  describe('create', () => {
    it('creates a config file in current directory', done => {
      fs.readdir(process.cwd(), (err, files) => {
        assert.notOk(err)
        assert.equal(files.indexOf(config.configName), -1)

        config.create(err => {
          assert.notOk(err)

          fs.readdir(process.cwd(), (err, files) => {
            assert.notOk(err)
            assert.isAbove(files.indexOf(config.configName), -1)
            done()
          })
        })
      })
    })
  })

  describe('checkPwd', () => {
    it('checks if current directory has a config file', done => {
      config.checkPwd((err, exists) => {
        assert.isNull(err)
        assert.isFalse(exists)

        config.create(err => {
          assert.notOk(err)

          config.checkPwd((err, exists) => {
            assert.isNull(err)
            assert.isTrue(exists)
            done()
          })
        })
      })
    })
  })

  describe('read', () => {
    context('project not initialized', () => {
      it('returns an error', done => {
        config.read((err, data) => {
          assert.isObject(err)
          assert.notOk(data)
          done()
        })
      })
    })

    context('project is initialized', () => {
      beforeEach(project.init)

      it('returns the config file data', done => {
        config.read((err, data) => {
          assert.isNull(err)
          assert.deepEqual(data, defaults.configData)
          done()
        })
      })
    })
  })

  describe('addEndpoint', () => {
    const url = 'http://test-endpoint.com/api/v1/stuff/43'
    const opts = {port: 1234, action: 'put'}

    context('project not initialized', () => {
      it('returns an error', done => {
        config.addEndpoint(url, opts, err => {
          assert.isObject(err)
          done()
        })
      })
    })

    context('project is initialized', () => {
      beforeEach(project.init)

      it('accepts a url and updates the config file', done => {
        config.addEndpoint(url, opts, err => {
          assert.notOk(err)

          config.read((err, configData) => {
            assert.notOk(err)

            const item = utils.findBy(configData.endpoints, {port: opts.port})

            assert.include(item[opts.action], utils.cleanUrl(url))

            done()
          })
        })
      })

      it('adds url to existing item if port present', done => {
        opts.port = 5000
        opts.action = 'get'

        config.addEndpoint(url, opts, err => {
          assert.notOk(err)

          config.read((err, configData) => {
            assert.notOk(err)

            assert.equal(configData.endpoints.length, 1)
            assert.equal(configData.endpoints[0].port, opts.port)
            assert.equal(configData.endpoints[0][opts.action].length, 1)
            assert.equal(configData.endpoints[0][opts.action][0], utils.cleanUrl(url))

            config.addEndpoint(url + '/more-stuff', opts, err => {
              assert.notOk(err)

              config.read((err, configData) => {
                assert.notOk(err)

                assert.equal(configData.endpoints.length, 1)
                assert.equal(configData.endpoints[0].port, opts.port)
                assert.equal(configData.endpoints[0][opts.action].length, 2)
                assert.include(configData.endpoints[0][opts.action], utils.cleanUrl(url))
                assert.include(
                  configData.endpoints[0][opts.action],
                  utils.cleanUrl(url + '/more-stuff')
                )

                done()
              })
            })
          })
        })
      })

      it('adds url to existing item and sets new action', done => {
        let opts = { port: "5000", action: "get" }

        config.addEndpoint(url, opts, err => {
          assert.notOk(err)

          opts = { port: "5000", action: "put" }
          config.addEndpoint(url + '/more', opts, err => {
            assert.notOk(err)

            config.read((err, configData) => {
              assert.notOk(err)

              assert.equal(configData.endpoints.length, 1)
              assert.equal(configData.endpoints[0].port, 5000)

              assert.equal(configData.endpoints[0].get.length, 1)
              assert.equal(configData.endpoints[0].put.length, 1)

              assert.include(configData.endpoints[0].get[0], utils.cleanUrl(url))
              assert.include(configData.endpoints[0].put[0], utils.cleanUrl(url + '/more'))

              done()
            })
          })
        })
      })

      it('will not add the same endpoint to the same port/action item', done => {
        let opts = { port: "5000", action: "get" }

        config.addEndpoint(url, opts, err => {
          assert.notOk(err)

          config.addEndpoint(url, opts, err => {
            assert.notOk(err)

            config.read((err, configData) => {
              assert.notOk(err)

              assert.equal(configData.endpoints.length, 1)
              assert.equal(configData.endpoints[0].port, opts.port)

              assert.equal(configData.endpoints[0][opts.action].length, 1)

              assert.include(
                configData.endpoints[0][opts.action][0],
                utils.cleanUrl(url)
              )

              done()
            })
          })
        })
      })

      it('creates a new config item if port not present', done => {
        let opts = { port: 1234, action: "post" }

        config.addEndpoint(url, opts, err => {
          assert.notOk(err)

          config.read((err, configData) => {
            assert.notOk(err)

            assert.equal(configData.endpoints.length, 2)

            assert.equal(configData.endpoints[0].port, 5000)
            assert.equal(configData.endpoints[0].get.length, 0)

            assert.equal(configData.endpoints[1].port, 1234)
            assert.equal(configData.endpoints[1].post.length, 1)
            assert.include(
              configData.endpoints[1][opts.action][0],
              utils.cleanUrl(url)
            )

            done()
          })
        })
      })

      it('uses default port if port option not supplied', done => {
        let opts = { action: "post" }

        config.addEndpoint(url, opts, err => {
          assert.notOk(err)

          config.read((err, configData) => {
            assert.notOk(err)

            assert.equal(configData.endpoints.length, 1)

            assert.equal(configData.endpoints[0].port, 5000)
            assert.equal(configData.endpoints[0].get.length, 0)
            assert.equal(configData.endpoints[0].post.length, 1)

            done()
          })
        })
      })

      it('uses default action if action option not supplied', done => {
        config.addEndpoint(url, {}, err => {
          assert.notOk(err)

          config.read((err, configData) => {
            assert.notOk(err)

            assert.equal(configData.endpoints.length, 1)

            assert.equal(configData.endpoints[0].port, 5000)
            assert.equal(configData.endpoints[0].get.length, 1)

            done()
          })
        })
      })
    })
  })

  describe('removeEndpoint', () => {
    const url = 'http://test-endpoint.com/api/v1/stuff/43'

    context('project not initialized', () => {
      it('returns an error', done => {
        config.removeEndpoint(url, {}, err => {
          assert.isObject(err)
          done()
        })
      })
    })

    context('project is initialized', () => {
      beforeEach(project.init)

      it('returns error if url not found', done => {
        done()
      })

      it('removes url from default port and action if not supplied', done => {
        done()
      })

      it('removes url from given port and action', done => {
        done()
      })
    })
  })


})
