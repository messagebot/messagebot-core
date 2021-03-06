exports.status = {
  name: 'transports:list',
  description: 'transports:list',
  middleware: ['logged-in-session'],
  outputExample: {},

  run: function (api, data, next) {
    data.response.transports = {}
    api.transports.forEach((transport) => {
      data.response.transports[transport.name] = {
        name: transport.name,
        description: transport.description,
        requiredDataKeys: transport.requiredDataKeys,
        campaignVariables: transport.campaignVariables
      }
    })

    next()
  }
}
