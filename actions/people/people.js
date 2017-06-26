var buildWhere = function (api, data) {
  var where = {
    teamId: data.team.id
  }

  for (var i in data.params.searchKeys) {
    if (data.params.searchKeys[i].indexOf('data.') === 0) {
      var key = data.params.searchKeys[i].split('.')[1]
      var value = data.params.searchValues[i]
      if (!where.guid) { where.guid = [] }
      where.guid.push(
        api.sequelize.sequelize.literal(`SELECT personGuid FROM personData WHERE \`key\` = "${key}" and \`value\` LIKE "${value}"`)
      )
    }
  }

  for (var j in data.params.searchKeys) {
    if (data.params.searchKeys[j].indexOf('data.') !== 0) {
      where[data.params.searchKeys[j]] = data.params.searchValues[j]
    }
  }

  return where
}

exports.peopleSearch = {
  name: 'people:search',
  description: 'people:search',
  outputExample: {},
  middleware: ['logged-in-session', 'require-team', 'role-required-admin'],

  inputs: {
    searchKeys: { required: true },
    searchValues: { required: true },
    from: {
      required: false,
      formatter: function (p) { return parseInt(p) },
      default: function (p) { return 0 }
    },
    size: {
      required: false,
      formatter: function (p) { return parseInt(p) },
      default: function (p) { return 100 }
    },
    sort: { required: false }
  },

  run: function (api, data, next) {
    api.models.Person.findAndCountAll({
      where: buildWhere(api, data),
      order: data.params.sort,
      limit: data.params.size,
      offset: data.params.from
    }).then(function (result) {
      data.response.total = result.count
      data.response.people = result.rows.map(function (row) { return row.apiData() })
      next()
    }).catch(next)
  }
}

exports.peopleAggregation = {
  name: 'people:aggregation',
  description: 'people:aggregation',
  outputExample: {},
  middleware: ['logged-in-session', 'require-team', 'role-required-admin'],

  inputs: {
    searchKeys: { required: true },
    searchValues: { required: true },
    interval: {
      required: true,
      default: 'DATE'
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
    },
    sort: { required: false }
  },

  run: function (api, data, next) {
    api.models.Person.findAll({
      attributes: [
        [`${data.params.interval}(createdAt)`, data.params.interval],
        [api.sequelize.sequelize.fn('count', api.sequelize.sequelize.col('guid')), 'TOTAL']
      ],
      where: buildWhere(api, data),
      order: data.params.sort,
      limit: data.params.size,
      offset: data.params.from,
      group: `${data.params.interval}(createdAt)`
    }).then(function (results) {
      data.response.aggregations = {}
      results.forEach(function (r) {
        data.response.aggregations[r.dataValues[data.params.interval]] = r.dataValues.TOTAL
      })
      next()
    }).catch(next)
  }
}
