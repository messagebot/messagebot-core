const minTaskProcessors = parseInt(process.env.MIN_TASK_PROCESSORS || 1)
const maxTaskProcessors = parseInt(process.env.MAX_TASK_PROCESSORS || 1)
const toScheduler = process.env.SCHEDULER ? (process.env.SCHEDULER === 'true') : true

exports.default = {
  tasks: function (api) {
    return {
      // Should this node run a scheduler to promote delayed tasks?
      scheduler: toScheduler,
      // what queues should the taskProcessors work?
      queues: [
        'messagebot:lists',
        'messagebot:campaigns',
        'messagebot:events',
        'messagebot:messages',
        'messagebot:people',
        'messagebot:system',
        'messagebot:users'
      ],
      // Logging levels of task workers
      workerLogging: {
        failure: 'error', // task failure
        success: 'info',  // task success
        start: 'info',
        end: 'info',
        cleaning_worker: 'info',
        poll: 'debug',
        job: 'debug',
        pause: 'debug',
        internalError: 'error',
        multiWorkerAction: 'debug'
      },
      // Logging levels of the task scheduler
      schedulerLogging: {
        start: 'info',
        end: 'info',
        poll: 'debug',
        enqueue: 'debug',
        reEnqueue: 'debug',
        working_timestamp: 'debug',
        transferred_job: 'debug'
      },
      // how long to sleep between jobs / scheduler checks
      timeout: 5000,
      // at minimum, how many parallel taskProcessors should this node spawn?
      // (have number > 0 to enable, and < 1 to disable)
      minTaskProcessors: minTaskProcessors,
      // at maximum, how many parallel taskProcessors should this node spawn?
      maxTaskProcessors: maxTaskProcessors,
      // how often should we check the event loop to spawn more taskProcessors?
      checkTimeout: 1000,
      // how many ms would constitue an event loop delay to halt taskProcessors spawning?
      maxEventLoopDelay: 5,
      // When we kill off a taskProcessor, should we disconnect that local redis connection?
      toDisconnectProcessors: true,
      // Customize Resque primitives, replace null with required replacement.
      resque_overrides: {
        queue: null,
        multiWorker: null,
        scheduler: null
      }
    }
  }
}

exports.test = {
  tasks: function (api) {
    return {
      scheduler: false,
      timeout: 100,
      minTaskProcessors: 0,
      maxTaskProcessors: 0
    }
  }
}
