const AbstractIndexer = require("../abstract_indexer");
const crypto = require("crypto");

class StatusIndexer extends AbstractIndexer {
  get LOGGER_NAME() {
    return 'status-indexer';
  }

  constructor(adapter, params) {
    super(adapter, params);
  }

  indexStatus (reporter) {
    const idHash = crypto.createHash('md5')
      .update(JSON.stringify(reporter.report), 'utf-8')
      .digest('hex');

    return this.indexExists()
      .then(indexExists => {
        if(indexExists) {
          return this.deleteIndex();
        }
      })
      .then(() => this.initIndex())
      .then(() => this.initMapping())
      .then(() => {
        reporter.report.timestamp = (new Date()).toString();
        return this.indexDocument({
          "index": this.esIndex,
          "type": this.esType,
          "id": idHash,
          "body": JSON.stringify(reporter.report)
        });
      })
      .then(() => {
        this.client.indices.getAlias({
          name: this.esAlias
        }, (err, response, status)=> {
          if(status) {
            this.logger.debug(`Status: ${status}`);
          }
          return response;
        });
      })
      .then((oldStatusIndez) => {
        this.client.updateAliases({
          body: {
            actions: [
              { remove: { index: oldStatusIndez, alias: this.esAlias } },
              { add: { index: this.esIndex, alias: this.esAlias } }
            ]
          }
        });
      });
  }
}

module.exports = StatusIndexer;
