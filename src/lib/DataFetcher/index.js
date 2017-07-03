import Pollable from '../Pollable';
import { prefixEnum } from '../Enum';
import getDataFetcherReducer, {
  getDefaultDataReducer,
  getDefaultTimestampReducer,
} from './getDataFetcherReducer';
import moduleStatuses from '../../enums/moduleStatuses';
import baseActionTypes from './baseActionTypes';
import proxify from '../proxy/proxify';
import ensureExist from '../ensureExist';

const DEFAULT_TTL = 30 * 60 * 1000;
const DEFAULT_RETRY = 62 * 1000;

export default class DataFetcher extends Pollable {
  constructor({
    auth,
    client,
    storage,
    subscription,
    tabManager,
    timeToRetry = DEFAULT_RETRY,
    ttl = DEFAULT_TTL,
    polling = false,
    name,
    actionTypes = prefixEnum({ enumMap: baseActionTypes, prefix: name }),
    getReducer = getDataFetcherReducer,
    getDataReducer = getDefaultDataReducer,
    getTimestampReducer = getDefaultTimestampReducer,
    dataStorageKey = `${name}Data`,
    timestampStorageKey = `${name}Timestamp`,
    fetchFunction,
    subscriptionFilters,
    subscriptionHandler,
    readyCheckFn,
    ...options
  }) {
    if (!name) {
      throw new Error('name must be defined');
    }
    if (typeof fetchFunction !== 'function') {
      throw new Error('fetchFunction must be a asynchronous function');
    }
    super({
      ...options,
      actionTypes,
    });
    this._auth = this::ensureExist(auth, 'auth');
    this._client = this::ensureExist(client, 'client');
    this._storage = storage;
    this._subscription = subscription;
    this._tabManager = tabManager;
    this._ttl = ttl;
    this._timeToRetry = timeToRetry;
    this._polling = polling;
    this._fetchFunction = fetchFunction;
    this._subscriptionFilters = subscriptionFilters;
    this._subscriptionHandler = subscriptionHandler;
    this._readyCheckFn = readyCheckFn;

    this._dataStorageKey = dataStorageKey;
    this._timestampStorageKey = timestampStorageKey;

    if (this._storage) {
      this._reducer = getReducer(this.actionTypes);

      this._storage.registerReducer({
        key: this._dataStorageKey,
        reducer: getDataReducer(this.actionTypes),
      });
      this._storage.registerReducer({
        key: this._timestampStorageKey,
        reducer: getTimestampReducer(this.actionTypes),
      });
    } else {
      this._reducer = getReducer(this.actionTypes, {
        timestamp: getTimestampReducer(this.actionTypes),
        data: getDataReducer(this.actionTypes),
      });
    }

    this._promise = null;
    this._lastMessage = null;
  }
  initialize() {
    this.store.subscribe(() => this._onStateChange());
  }
  async _onStateChange() {
    if (this._shouldInit()) {
      await this._initModule();
    } else if (this._shouldReset()) {
      this._clearTimeout();
      this._promise = null;
      this.store.dispatch({
        type: this.actionTypes.resetSuccess,
      });
    } else if (this._shouldSubscribe()) {
      this._processSubscription();
    }
  }
  _shouldInit() {
    return (
      this._auth.loggedIn &&
      (!this._storage || this._storage.ready) &&
      (!this._readyCheckFn || this._readyCheckFn()) &&
      (!this._subscription || this._subscription.ready) &&
      this.pending
    );
  }
  _shouldReset() {
    return (
      (
        !this._auth.loggedIn ||
        (!!this._storage && !this._storage.ready) ||
        (!!this._readyCheckFn && !this._readyCheckFn()) ||
        (!!this._subscription && !this._subscription.ready)
      ) &&
      this.ready
    );
  }
  _shouldSubscribe() {
    return (
      this.ready &&
      !!this._subscription &&
      this._subscription.ready &&
      !!this._subscriptionHandler &&
      !!this._subscription.message &&
      this._subscription.message !== this._lastMessage
    );
  }
  _shouldFetch() {
    return (
      (!this._tabManager || this._tabManager.active) &&
        (
          this._auth.isFreshLogin ||
          !this.timestamp ||
          Date.now() - this.timestamp > this.ttl
        )
    );
  }
  async _initModule() {
    this.store.dispatch({
      type: this.actionTypes.init,
    });
    if (this._shouldFetch()) {
      try {
        await this.fetchData();
      } catch (e) {
        console.error('fetchData error:', e);
      }
    } else if (this._polling) {
      this._startPolling();
    } else {
      this._retry();
    }
    if (this._subscription && this._subscriptionFilters) {
      this._subscription.subscribe(this._subscriptionFilters);
    }
    this.store.dispatch({
      type: this.actionTypes.initSuccess,
    });
  }
  _processSubscription() {
    this._lastMessage = this._subscription.message;
    this._subscriptionHandler(this._lastMessage);
  }
  get data() {
    return this._storage ?
      this._storage.getItem(this._dataStorageKey) :
      this.state.data;
  }

  get timestamp() {
    return this._storage ?
      this._storage.getItem(this._timestampStorageKey) :
      this.state.timestamp;
  }

  get status() {
    return this.state.status;
  }

  get ready() {
    return this.state.status === moduleStatuses.ready;
  }

  get pending() {
    return this.state.status === moduleStatuses.pending;
  }

  get ttl() {
    return this._ttl;
  }

  get timeToRetry() {
    return this._timeToRetry;
  }

  @proxify
  async _fetchData() {
    this.store.dispatch({
      type: this.actionTypes.fetch,
    });
    const ownerId = this._auth.ownerId;
    try {
      const data = await this._fetchFunction();
      if (this._auth.ownerId === ownerId) {
        this.store.dispatch({
          type: this.actionTypes.fetchSuccess,
          data,
          timestamp: Date.now(),
        });
        if (this._polling) {
          this._startPolling();
        }
        this._promise = null;
      }
    } catch (error) {
      if (this._auth.ownerId === ownerId) {
        this._promise = null;
        this.store.dispatch({
          type: this.actionTypes.fetchError,
          error,
        });
        if (this._polling) {
          this._startPolling(this.timeToRetry);
        } else {
          this._retry();
        }
        throw error;
      }
    }
  }
  @proxify
  async fetchData() {
    if (!this._promise) {
      this._promise = this._fetchData();
    }
    return this._promise;
  }
}
