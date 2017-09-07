import Enum from '../../lib/Enum';
import moduleActionTypes from '../../enums/moduleActionTypes';

export default new Enum([
  ...Object.keys(moduleActionTypes),
  'connect',
  'connectError',
  'connected',
  'registered',
  'registrationFailed',
  'disconnect',
  'unregistered',
  'reconnect',
  'resetRetryCounts',
  'updateSessions',
  'destroySessions',
  'callStart',
  'callEnd',
  'callRing',
  'toggleMinimized',
  'resetMinimized',
  'videoElementPrepared',
  'getUserMediaSuccess',
  'getUserMediaError',
], 'webphone');
