/* eslint-disable no-undefined */
import actionCreatorFactory, { isType } from '../src/index';
import * as assert from 'assert';

describe('test typescript fsa', () => {
  it('isType', () => {
    const actionCreator = actionCreatorFactory();

    const action1 = actionCreator('ACTION_1');
    const action2 = actionCreator('ACTION_2');

    const action = action1();

    assert.equal(true, isType(action, action1));
    assert.equal(false, isType(action, action2));
  });

  it('actionCreator.match', () => {
    const actionCreator = actionCreatorFactory();

    const action1 = actionCreator('ACTION_1');
    const action2 = actionCreator('ACTION_2');

    const action = action1();

    assert.equal(true, action1.match(action));
    assert.equal(false, action2.match(action));
  });

  it('basic', () => {
    const actionCreator = actionCreatorFactory();

    const someAction = actionCreator<{ foo: string }>('ACTION_TYPE');

    assert.throws(
      () => actionCreator('ACTION_TYPE'),
      'Duplicate action type ACTION_TYPE'
    );

    assert.equal(someAction.type, 'ACTION_TYPE');

    const action = someAction({ foo: 'bar' });

    assert.equal(action.type, 'ACTION_TYPE');
    assert.equal(action.error, undefined);
    assert.equal(action.meta, undefined);
    assert.deepEqual(action.payload, { foo: 'bar' });
  });

  it('meta', () => {
    const actionCreator = actionCreatorFactory();

    const someAction = actionCreator('ACTION_TYPE');

    const action = someAction(undefined, { foo: 'bar' });

    assert.deepEqual(action.meta, { foo: 'bar' });

    const someActionWithMeta = actionCreator('ACTION_WITH_META', {
      foo: 'bar',
    });

    const actionWithMeta = someActionWithMeta(undefined);

    assert.deepEqual(actionWithMeta.meta, { foo: 'bar' });

    const actionWithExtraMeta = someActionWithMeta(undefined, { fizz: 'buzz' });

    assert.deepEqual(actionWithExtraMeta.meta, { foo: 'bar', fizz: 'buzz' });
  });

  it('error actions', () => {
    const actionCreator = actionCreatorFactory();

    const errorAction = actionCreator('ERROR_ACTION', null, true);

    const action = errorAction();

    assert.equal(true, action.error);

    const inferredErrorAction = actionCreator<any>('INF_ERROR_ACTION', null);

    assert.equal(false, !!inferredErrorAction({}).error);
    assert.equal(true, inferredErrorAction(new Error()).error);

    const customErrorAction = actionCreator<{
      isError: boolean;
    }>('CUSTOM_ERROR_ACTION', null, payload => payload.isError);

    assert.equal(false, !!customErrorAction({ isError: false }).error);
    assert.equal(true, customErrorAction({ isError: true }).error);

    const actionCreator2 = actionCreatorFactory(
      null,
      payload => payload.isError
    );

    const customErrorAction2 = actionCreator2<{
      isError: boolean;
    }>('CUSTOM_ERROR_ACTION');

    assert.equal(false, !!customErrorAction2({ isError: false }).error);
    assert.equal(true, customErrorAction2({ isError: true }).error);
  });

  it('prefix', () => {
    const actionCreator = actionCreatorFactory('somePrefix');

    const someAction = actionCreator('SOME_ACTION');

    assert.equal(someAction.type, 'somePrefix/SOME_ACTION');

    const action = someAction();

    assert.equal(action.type, 'somePrefix/SOME_ACTION');
  });

  it('async', () => {
    const actionCreator = actionCreatorFactory('prefix');

    const asyncActions = actionCreator.async<{ foo: string }, { bar: string }>(
      'DO_SOMETHING',
      { baz: 'baz' }
    );

    assert.equal(asyncActions.type, 'prefix/DO_SOMETHING');
    assert.equal(asyncActions.started.type, 'prefix/DO_SOMETHING_STARTED');
    assert.equal(asyncActions.done.type, 'prefix/DO_SOMETHING_DONE');
    assert.equal(asyncActions.failed.type, 'prefix/DO_SOMETHING_FAILED');

    const started = asyncActions.started({ foo: 'foo' });
    assert.equal(started.type, 'prefix/DO_SOMETHING_STARTED');
    assert.deepEqual(started.payload, { foo: 'foo' });
    assert.deepEqual(started.meta, { baz: 'baz' });
    assert.equal(!started.error, true);

    const done = asyncActions.done({
      params: { foo: 'foo' },
      result: { bar: 'bar' },
    });
    assert.equal(!done.error, true);

    const failed = asyncActions.failed({
      params: { foo: 'foo' },
      error: 'error',
    });
    assert.equal(failed.error, true);
  });
});
