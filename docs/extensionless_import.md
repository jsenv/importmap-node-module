# Extensionless import

If the code you wants to run contains one ore more extensionless path specifier, it will not be found by a browser (not even by Node.js).

_extensionless import example_

```js
import { foo } from "./file"
```

In this situation, you can do one of the following:

1. Add extension in the source file
2. If there is a build step, ensure extension are added during the build
3. Add remapping in `exports` field of your `package.json`

   ```json
   {
     "exports": {
       "./file": "./file.js"
     }
   }
   ```

   Or using [Subpath patterns](https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_subpath_patterns)

   ```json
   {
     "exports": {
       "./*": "./*.js"
     }
   }
   ```

4. Remap manually each extensionless import and pass that importmap in [initialImportMap](#initialImportMap)
