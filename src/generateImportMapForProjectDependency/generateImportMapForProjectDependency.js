import { createNodeModulesImportMapGenerator } from "../createNodeModulesImportMapGenerator.js"

// non ce que je veux c'est pas ça
// je veux l'importMap de @jsenv/core
// comme en considérant que rootProjectPath
// c'est bien le project en cours
// mais je veux que le résultat soit pas scope
// a la sous dépendance mais fasse partie de l'importMap
// comme si @jsenv/core faisait partie du projet
// alors que rootProjectPath pour le moment
// va forcément scope les fichiers dans @jsenv/bundling
// par ex
// il faut donc plutot une option genre rootProjectInheritProject = false
// qu'on peut passer a true

export const generateImportMapForProjectDependency = async ({
  projectPath,
  rootProjectPath,
  onWarn,
  dependencyName,
}) => {
  const generator = createNodeModulesImportMapGenerator({
    projectPath,
    rootProjectPath,
    onWarn,
  })
  const dependencyImportMap = await generator.generateImportMapForProjectDependency({
    dependencyName,
  })
  return dependencyImportMap
}
