import { expect } from 'chai';
import getSoftphoneReducer, {
  getSoftphoneStatusReducer,
} from './getSoftphoneReducer';
import softphoneStatus from './softphoneStatus';
import softphoneActionTypes from './actionTypes';

describe('Softphone', () => {
  describe('getSoftphoneStatusReducer', () => {
    const reducer = getSoftphoneStatusReducer(softphoneActionTypes);
    it('should be a function', () => {
      expect(getSoftphoneStatusReducer).to.be.a('function');
    });
    it('should have initial state of idle', () => {
      expect(reducer(undefined, {})).to.equal(softphoneStatus.idle);
    });
    it('should return original state if actionType is not recognized', () => {
      const originalState = {};
      expect(reducer(originalState, { type: 'foo' }))
        .to.equal(originalState);
    });
    it('should return idle status if actionType is connectComplete', () => {
      expect(reducer('foo', {
        type: softphoneActionTypes.connectComplete,
      })).to.equal(softphoneStatus.idle);
    });
    it('should return connecting status if actionType is startToConnect', () => {
      expect(reducer('foo', {
        type: softphoneActionTypes.startToConnect,
      })).to.equal(softphoneStatus.connecting);
    });
  });
  describe('getSoftphoneReducer', () => {
    it('should be a function', () => {
      expect(getSoftphoneReducer).to.be.a('function');
    });
    it('should return a reducer', () => {
      const reducer = getSoftphoneReducer();
      const softphoneStatusReducer = getSoftphoneStatusReducer();
      it('should return combined state', () => {
        expect(reducer(undefined, {}))
          .to.deep.equal({
            softphoneStatus: softphoneStatusReducer(undefined, {}),
          });
      });
    });
  });
});
