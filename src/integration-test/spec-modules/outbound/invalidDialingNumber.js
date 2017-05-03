import { ensureLogin, containsErrorMessage } from '../../utils/HelpUtil';
import callErrors from '../../../modules/Call/callErrors';

export default (Auth, Alert, Client, RegionSettings, Call, testAccount, caseId = '') => {
  const testAccounts = testAccount && testAccount.constructor === Array ? testAccount : [testAccount];
  testAccounts.forEach((account) => {
    describe(`${caseId} Outbound call - Error handling for invalid dialing number', ${account.accountType ? `(${account.accountType})` : ''}`, function () {
      this.timeout(10000);
      before(async function () {
        const isLoginSuccess = await ensureLogin(Auth, account);
        if (!isLoginSuccess) {
          this.skip();
          console.error('Skip test case as failed to login with credential ', account);
        }
      });
      it('Should Alert Invalid Number - Invalid Char in ToNumber', async() => {
        Call.onToNumberChange("iamn%@onedi!@$%^&()_=\\][';/.,~nu><.,,?/mber#*");
        await Call.onCall();
        expect(containsErrorMessage(Alert.state.messages, callErrors.noToNumber))
          .to.not.equal(undefined);
        expect(containsErrorMessage(Alert.state.messages, callErrors.noAreaCode))
          .to.equal(undefined);
        expect(containsErrorMessage(Alert.state.messages, callErrors.specialNumber))
          .to.equal(undefined);
        expect(containsErrorMessage(Alert.state.messages, callErrors.notAnExtension))
          .to.equal(undefined);
      });
      it('Should Alert Invalid Number - Do not enter anything', async() => {
        Call.onToNumberChange('');
        await Call.onCall();
        expect(containsErrorMessage(Alert.state.messages, callErrors.noToNumber))
          .to.not.equal(undefined);
        expect(containsErrorMessage(Alert.state.messages, callErrors.noAreaCode))
          .to.equal(undefined);
        expect(containsErrorMessage(Alert.state.messages, callErrors.specialNumber))
          .to.equal(undefined);
        expect(containsErrorMessage(Alert.state.messages, callErrors.notAnExtension))
          .to.equal(undefined);
      });
    });
  });
};
