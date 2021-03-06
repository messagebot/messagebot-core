const Sequelize = require('sequelize')
const uuid = require('uuid')

let loader = function (api) {
  /* --- Priave Methods --- */

  /* --- Public Model --- */

  return {
    name: 'Event',

    model: api.sequelize.sequelize.define('event',
      {
        guid: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: () => { return uuid.v4() }
        },
        teamGuid: {
          allowNull: false,
          type: Sequelize.BIGINT
        },

        'ip': {
          type: Sequelize.STRING,
          allowNull: false
        },
        'device': {
          type: Sequelize.STRING,
          allowNull: false
        },
        'personGuid': {
          type: Sequelize.UUID,
          allowNull: false
        },
        'messageGuid': {
          type: Sequelize.UUID,
          allowNull: true
        },
        'type': {
          type: Sequelize.STRING,
          allowNull: false
        },
        'lat': {
          type: Sequelize.DECIMAL,
          allowNull: true
        },
        'lng': {
          type: Sequelize.DECIMAL,
          allowNull: true
        }
      },
      {
        hooks: {
          beforeCreate: (self) => { return api.sequelize.updatateData(self, api.models.EventData, 'eventGuid') },
          beforeUpdate: (self) => { return api.sequelize.updatateData(self, api.models.EventData, 'eventGuid') },
          beforeDestroy: (self) => { return api.models.EventData.destroy({where: {eventGuid: self.guid}}) }
        },

        instanceMethods: {
          hydrate: function (callback) {
            this.data = {}
            let self = this
            api.models.EventData.findAll({where: {eventGuid: self.guid}}).then((datas) => {
              datas.forEach((d) => { self.data[d.key] = d.value })
              callback(null, datas)
            }).catch(callback)
          },

          apiData: function () {
            return {
              guid: this.guid,
              ip: this.ip,
              device: this.device,
              personGuid: this.personGuid,
              messageGuid: this.messageGuid,
              type: this.type,
              lat: this.lat,
              lng: this.lng,

              data: this.data || {},

              createdAt: this.createdAt,
              updatedAt: this.updatedAt
            }
          }
        }
      }
    )
  }
}

module.exports = loader
