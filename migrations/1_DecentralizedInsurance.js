const DecentralizedInsurance = artifacts.require("DecentralizedInsurance");

module.exports = function (deployer) {
  deployer.deploy(DecentralizedInsurance);
};
