// creates and loads list of require statements for each regex match
const context = require.context("../src", true, /spec\.js$/);
context.keys().forEach(context);
