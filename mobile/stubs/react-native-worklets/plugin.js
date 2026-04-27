// No-op Babel plugin stub.
// react-native-css-interop@0.2.x adds this plugin unconditionally,
// but it only applies to Reanimated 4+. We are on Reanimated 3, so this is a no-op.
module.exports = function () {
  return { visitor: {} };
};
