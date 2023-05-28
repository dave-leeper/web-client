const assert = (passed, description, results, optionalContinueOnError) => {
  if (description && results) { results.push({ description, passed: !!passed }) }
  if (!!passed || optionalContinueOnError) { return }
  if (results) { throw results } 
  else if (description) { throw new Error(description) }
  else { throw new Error(`Assert failed.`) }
}
const test = async (t) => {
  const testNode = new TreeNode(t.name)
  const start = Date.now()
  const testResults = t.test()
  const duration = Date.now() - start
  let testFailCount = 0

  for (let loop = 0; loop < testResults.length; loop++) {
    const result = testResults[loop]

    if (!result.passed) { testFailCount++} 
  }
  testNode.name = t.name
  testNode.description = t.description
  testNode.results = testResults
  testNode.duration = duration
  testNode.passed = (0 === testFailCount)
  testNode.failCount = testFailCount
  
  return testNode
}
const suite = async (tests, optionalViewBuilder) => {
  let suiteTree = new Tree(tests.name)
  let suiteFailCount = 0

  suiteTree.name = tests.name
  suiteTree.description = tests.description
  suiteTree.passed = true
  suiteTree.type = `SUITE`
  for (let loop = 0; loop < tests.tests.length; loop++) {
    const t = tests.tests[loop]
    const testNode = test(t)

    suiteTree.addNode(testNode)
    suiteFailCount += testNode.failCount
  }
  suiteTree.passed = (0 === suiteFailCount)
  suiteTree.failCount = suiteFailCount
  optionalViewBuilder && optionalViewBuilder(suiteTree)
  return suiteTree
}