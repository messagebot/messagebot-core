const async = require('async')
const fs = require('fs')
const csv = require('fast-csv')

let guidListFormatter = function (p) {
  let arr = []
  if (Array.isArray(p)) { return p }
  p = p.replace(/\s/g, '')
  p.split(',').forEach((guid) => {
    if (guid && guid.length > 0) { arr.push(guid) }
  })

  return arr
}

exports.listPeopleAdd = {
  name: 'list:people:add',
  description: 'list:people:add',
  outputExample: {},
  middleware: ['logged-in-session', 'require-team', 'role-required-admin'],

  inputs: {
    listGuid: {
      required: true
    },
    personGuids: {
      required: false,
      formatter: guidListFormatter
    },
    file: {
      required: false
    }
  },

  run: function (api, data, next) {
    let jobs = []
    data.response.personGuids = []

    api.models.List.findOne({where: {
      guid: data.params.listGuid,
      teamGuid: data.session.teamGuid
    }}).then((list) => {
      if (!list) { return next(new Error('list not found')) }
      if (list.type !== 'static') { return next(new Error('you cannot modify static list membership via this method')) }

      let complete = function () {
        if (jobs.length === 0) { return next(new Error('nothing to edit')) }

        async.series(jobs, (error) => {
          if (!error) {
            api.tasks.enqueue('lists:peopleCount', {listGuid: list.guid}, 'messagebot:lists', next)
          } else {
            return next(error)
          }
        })
      }

      if (data.params.personGuids && data.params.personGuids.length > 0) {
        data.params.personGuids.forEach((personGuid) => {
          jobs.push((done) => {
            api.models.Person.find({where: {
              teamGuid: data.team.guid,
              guid: personGuid
            }}).then((person) => {
              if (!person) { return done(new Error(`Person (${personGuid}) not found`)) }
              api.models.ListPerson.findOrCreate({where: {
                personGuid: person.guid,
                listGuid: list.guid,
                teamGuid: list.teamGuid
              }}).then((listPerson) => {
                data.response.personGuids.push(person.guid)
                done()
              }).catch(done)
            }).catch(done)
          })
        })

        complete()
      } else if (data.params.file && data.params.file.path) {
        let file = data.params.file.path
        let fileStream = fs.createReadStream(file).on('error', next)
        let csvStream = csv({
          headers: true,
          ignoreEmpty: true,
          trim: true
        }).on('data', (d) => {
          jobs.push((done) => {
            let person = api.models.Person.build({
              teamGuid: data.team.guid,
              device: d.device || 'unknown',
              listOptOuts: [],
              globalOptOut: false,
              source: d.source || 'upload'
            })
            person.data = {}

            if (d.guid) { person.guid = d.guid }
            if (d.createdAt) { person.createdAt = d.createdAt }

            for (let i in d) {
              if (person[i] === null || person[i] === undefined) { person.data[i] = d[i] }
            }

            person.save().then(() => {
              api.models.ListPerson.findOrCreate({where: {
                personGuid: person.guid,
                listGuid: list.guid,
                teamGuid: list.teamGuid
              }}).then(() => {
                data.response.personGuids.push(person.guid)
                api.tasks.enqueueIn(1, 'people:buildCreateEvent', {guid: person.guid, teamGuid: data.team.guid}, 'messagebot:people', done)
              }).catch(done)
            }).catch((error) => {
              // TODO: this is brittle as it relies on string parsing
              if (!error.toString().match(/^Error: personGuid .* already exists with/)) { return done(error) }

              let personGuid = error.toString().split(' ')[2]
              api.models.Person.findOne({where: {guid: personGuid}}).then((person) => {
                if (!person) { return done(new Error(`Person (${personGuid}) not found`)) }
                person.hydrate((error) => {
                  if (error) { return done(error) }
                  if (d.device) { person.device = d.device }
                  if (d.source) { person.source = d.source }
                  for (let i in d) {
                    if (person[i] === null || person[i] === undefined) { person.data[i] = d[i] }
                  }

                  person.save().then(() => {
                    api.models.ListPerson.findOrCreate({where: {
                      personGuid: person.guid,
                      listGuid: list.guid,
                      teamGuid: list.teamGuid
                    }}).then(() => {
                      data.response.personGuids.push(person.guid)
                      done()
                    }).catch(done)
                  }).catch(done)
                })
              }).catch(done)
            })
          })
        }).on('end', complete)

        fileStream.pipe(csvStream)
      } else {
        return next(new Error('No people are provided via CSV'))
      }
    }).catch(next)
  }
}

exports.listPeopleDelete = {
  name: 'list:people:delete',
  description: 'list:people:delete',
  outputExample: {},
  middleware: ['logged-in-session', 'require-team', 'role-required-admin'],

  inputs: {
    listGuid: {
      required: true
    },
    personGuids: {
      required: false,
      formatter: guidListFormatter
    },
    file: {
      required: false
    }
  },

  run: function (api, data, next) {
    api.models.List.findOne({where: {
      guid: data.params.listGuid,
      teamGuid: data.session.teamGuid
    }}).then((list) => {
      let jobs = []
      if (!list) { return next(new Error('list not found')) }
      if (list.type !== 'static') { return next(new Error('you can only modify static list membership via this method')) }

      data.response.deletedListPeople = []
      data.params.personGuids.forEach((personGuid) => {
        jobs.push((done) => {
          api.models.ListPerson.find({
            where: {
              personGuid: personGuid,
              listGuid: list.guid,
              teamGuid: list.teamGuid
            }
          }).then((listPerson) => {
            if (!listPerson) { return done(new Error('List Person (guid ' + personGuid + ') not found in this list')) }
            data.response.deletedListPeople.push(listPerson.apiData())
            listPerson.destroy().then(() => {
              return done()
            }).catch(done)
          }).catch(done)
        })
      })

      async.series(jobs, (error) => {
        if (!error) {
          return api.tasks.enqueue('lists:peopleCount', {listGuid: list.guid}, 'messagebot:lists', next)
        } else {
          return next(error)
        }
      })
    }).catch(next)
  }
}

exports.listPeopleCount = {
  name: 'list:people:count',
  description: 'list:people:count',
  outputExample: {},
  middleware: ['logged-in-session', 'require-team', 'role-required-admin'],

  inputs: {
    listGuid: {
      required: true
    }
  },

  run: function (api, data, next) {
    api.models.List.findOne({where: {
      guid: data.params.listGuid,
      teamGuid: data.session.teamGuid
    }}).then((list) => {
      if (!list) { return next(new Error('list not found')) }
      list.associateListPeople((error) => {
        if (error) { return next(error) }
        list.reload().then(() => {
          data.response.list = list.apiData()
          next()
        }).catch(error)
      })
    }).catch(next)
  }
}

exports.listPeopleView = {
  name: 'list:people:view',
  description: 'list:people:view',
  outputExample: {},
  middleware: ['logged-in-session', 'require-team', 'role-required-admin'],

  inputs: {
    listGuid: {
      required: true
    },
    from: {
      required: false,
      formatter: function (p) { return parseInt(p) },
      default: function (p) { return 0 }
    },
    size: {
      required: false,
      formatter: function (p) { return parseInt(p) },
      default: function (p) { return 100 }
    }
  },

  run: function (api, data, next) {
    api.models.List.findOne({where: {
      guid: data.params.listGuid,
      teamGuid: data.session.teamGuid
    }}).then((list) => {
      if (!list) { return next(new Error('list not found')) }

      api.models.ListPerson.findAndCountAll({
        where: {
          listGuid: list.guid,
          teamGuid: list.teamGuid
        },
        include: [api.models.Person],
        order: [['personGuid', 'asc']],
        offset: data.params.from,
        limit: data.params.size
      }).then((response) => {
        data.response.total = response.count
        data.response.people = []
        let jobs = []

        response.rows.forEach((listPerson) => {
          jobs.push((done) => {
            listPerson.person.hydrate((error) => {
              data.response.people.push(listPerson.person.apiData())
              return done(error)
            })
          })
        })

        async.series(jobs, next)
      }).catch(next)
    }).catch(next)
  }
}
