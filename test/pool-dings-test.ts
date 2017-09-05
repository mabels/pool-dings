import { assert } from 'chai';
import * as winston from 'winston';
import * as poolDings from '../src/pool-dings';

const logger = new winston.Logger({
  level: 'info',
  transports: [
    new (winston.transports.Console)(),
  ]
});

describe('PoolDings', () => {

  it('sinple', (done) => {
    // simple
    const poolSize = 10;
    const pd = poolDings.create(logger, poolSize, 1);
    let makeCount = 0;
    let startCount = 0;
    let runCount = 0;
    let stopCount = 0;
    const af = new class Af implements poolDings.ActionFactory {
      public make(): poolDings.Action {
        ++makeCount;
        return new class Ac implements poolDings.Action {
          public start(cb: () => void): void {
            ++startCount;
            cb();
          }
          public run(cb: () => void): void {
            ++runCount;
            setTimeout(cb, 1);
            // cb();
          }
          public stop(cb: () => void): void {
            ++stopCount;
            cb();
          }
        };
      }
    };
    let count = 0;
    function action(): void {
      startCount = makeCount = runCount = 0;
      pd.start(af);
      assert.equal(makeCount, poolSize);
      assert.equal(startCount, poolSize);
      for (let i = 0; i < 10; ++i) {
        pd.dispatch();
      }
      setTimeout(() => {
        assert.equal(runCount, poolSize);
        runCount = 0;
        for (let i = 0; i < 5 * poolSize; ++i) {
          pd.dispatch();
        }
        setTimeout(() => {
          assert.equal(runCount, 5 * poolSize);
          pd.stop(() => {
            ++count;
            if (count >= 10) {
              done();
              return;
            }
            action();
          });
        }, 16);
      }, 5);
    }
    action();
  });

});
