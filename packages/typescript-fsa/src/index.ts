export interface AnyAction {
  type: any;
}

export type Meta = null | {[key: string]: any};

export interface Action<P> extends AnyAction {
  type: string;
  payload: P;
  error?: boolean;
  meta?: Meta;
}

export type Success<P, R> =
  ({params: P} | (P extends void ? {params?: P} : never)) &
  ({result: R} | (R extends void ? {result?: R} : never));

export type Failure<P, E> =
  ({params: P} | (P extends void ? {params?: P} : never)) &
  {error: E};

export function isType<P>(
  action: AnyAction,
  actionCreator: ActionCreator<P>,
): action is Action<P> {
  return action.type === actionCreator.type;
}

export type ActionCreator<P> = {
  type: string;
  match: (action: AnyAction) => action is Action<P>;
  (payload: P, meta?: Meta): Action<P>;
} & (P extends void ? {(payload?: P, meta?: Meta): Action<P>} : {});

export interface AsyncActionCreators<P, R, E> {
  type: string;
  started: ActionCreator<P>;
  done: ActionCreator<Success<P, R>>;
  failed: ActionCreator<Failure<P, E>>;
}

export interface ActionCreatorFactory {
  <P = void>(type: string, commonMeta?: Meta,
      isError?: boolean): ActionCreator<P>;
  <P = void>(type: string, commonMeta?: Meta,
      isError?: (payload: P) => boolean): ActionCreator<P>;

  async<P, R>(
    type: string, commonMeta?: Meta,
  ): AsyncActionCreators<P, R, {}>;
  async<P, R, E>(
    type: string, commonMeta?: Meta,
  ): AsyncActionCreators<P, R, E>;
}

declare const process: {
  env: {
    NODE_ENV?: string;
  };
};


export function actionCreatorFactory(
  prefix?: string | null,
  defaultIsError: (payload: any) => boolean = p => p instanceof Error,
): ActionCreatorFactory {
  const actionTypes: {[type: string]: boolean} = {};

  const base = prefix ? `${prefix}/` : "";

  function actionCreator<P>(
    type: string, commonMeta?: Meta,
    isError: ((payload: P) => boolean) | boolean = defaultIsError,
  ) {
    const fullType = base + type;

    if (process.env.NODE_ENV !== 'production') {
      if (actionTypes[fullType])
        throw new Error(`Duplicate action type: ${fullType}`);

      actionTypes[fullType] = true;
    }

    return Object.assign(
      (payload: P, meta?: Meta) => {
        const action: Action<P> = {
          type: fullType,
          payload,
        };

        if (commonMeta || meta) {
          action.meta = Object.assign({}, commonMeta, meta);
        }

        if (isError && (typeof isError === 'boolean' || isError(payload))) {
          action.error = true;
        }

        return action;
      },
      {
        type: fullType,
        toString: () => fullType,
        match: (action: AnyAction): action is Action<P> =>
          action.type === fullType,
      },
    ) as ActionCreator<P>;
  }

  function asyncActionCreators<P, S, E>(
    type: string, commonMeta?: Meta,
  ): AsyncActionCreators<P, S, E> {
    return {
      type: base + type,
      started: actionCreator<P>(`${type}_STARTED`, commonMeta, false),
      done: actionCreator<Success<P, S>>(`${type}_DONE`, commonMeta, false),
      failed: actionCreator<Failure<P, E>>(`${type}_FAILED`, commonMeta, true),
    };
  }

  return Object.assign(actionCreator, {async: asyncActionCreators});
}

export default actionCreatorFactory;
