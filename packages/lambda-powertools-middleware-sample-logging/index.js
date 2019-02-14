const Log = require('@perform/lambda-powertools-logger')
const CorrelationIds = require('@perform/lambda-powertools-correlation-ids')

// config should be { sampleRate: double } where sampleRate is between 0.0-1.0
module.exports = ({ sampleRate }) => {
  let rollback

  const isDebugEnabled = () => {
    const correlationIds = CorrelationIds.get()

    // allow upstream to enable debug logging for the entire call chain
    if (correlationIds['debug-log-enabled'] === 'true') {
      return true
    }

    return sampleRate && Math.random() <= sampleRate
  }

  return {
    before: (handler, next) => {
      rollback = undefined

      if (isDebugEnabled()) {
        rollback = Log.enableDebug()
      }

      next()
    },
    after: (handler, next) => {
      if (rollback) {
        rollback()
      }

      next()
    },
    onError: (handler, next) => {
      let awsRequestId = handler.context.awsRequestId
      let invocationEvent = JSON.stringify(handler.event)
      Log.error('invocation failed', { awsRequestId, invocationEvent }, handler.error)

      next(handler.error)
    }
  }
}
