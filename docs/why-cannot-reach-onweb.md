You have a server at `https://example.com` serving files inside `/Users/you/project`.<br />
Your project uses a file outside of your project folder like `/Users/you/node_modules/whatever/index.js`.

From a filesystem perspective we could find file using `../node_modules/whatever/index.js`.<br />
For a web client however `../node_modules/whatever/index.js` resolves to `https://example.com/node_modules/whatever/index.js`. Server would be requested at that url searching for `/Users/you/project/node_modules/whatever/index.js` instead of `/Users/you/node_modules/whatever/index.js`.
