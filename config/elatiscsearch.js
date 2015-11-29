exports.default = { 
  elasticsearch: function(api){
    return {
      urls: process.env.ELASTICSEARCH_URLS.split(','),
      log: {
        type: 'file',
        level: 'trace',
        path: __dirname + '/../log/elasticsearch.log'
      }
    };
  }
};
