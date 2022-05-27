const _ = require('lodash');

const devices = {
  pc: require('./pc.json'),
  mobile: require('./mobile.json'),
};

module.exports = function (terminal = 'pc') {
  const data = devices[terminal];
  const device = _.clone(data[_.random(0, data.length - 1)]);

  if (terminal == 'pc') {
    device.terminal = 'pc';
    device.pixelRatio = 1;
    device.isMobile = false;
    device.hasTouch = false;
    device.isLandscape = false;
  } else {
    device.terminal = 'mobile';
    device.pixelRatio = 2;
    device.isMobile = true;
    device.hasTouch = true;
    device.isLandscape = true;
  }

  return device;
};

module.exports.generateUa = () => {
  const data = [
    ...devices.pc,
    ...devices.mobile,
  ]
  return data[_.random(0, data.length - 1)]
}
