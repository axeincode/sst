const fs = require("fs");
const path = require("path");
const { runBuildCommand, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("nodejs-build-bundle-no-srcpath", async () => {
  await runBuildCommand(__dirname);

  // Test eslint created build
  const buildPath = path.join(__dirname, paths.appBuildDir);
  const buildFiles = fs.readdirSync(buildPath);
  // Sample files
  //  [
  //    '.esbuild.lambda-handler.json',
  //    '.esbuild.src-lambda-handler.json',
  //    'cdk.out',
  //    'eslint.js',
  //    'lambda-handler-1612170130511',
  //    'lambda-handler-1612170130511.zip',
  //    'lib',
  //    'run.js',
  //    'src-lambda-handler-1612170130622',
  //    'src-lambda-handler-1612170130622.zip',
  //    'sst-debug.log',
  //    'sst-merged.json'
  //  ]

  // Verify build output
  let handlerHash;
  let srcHandlerHash;
  buildFiles.forEach((file) => {
    if (file.match(/^lambda-handler-[\d]+$/)) {
      handlerHash = file;
    } else if (file.match(/^src-srcLambda-handler-[\d]+$/)) {
      srcHandlerHash = file;
    }
  });
  expect(handlerHash).toBeDefined();
  expect(srcHandlerHash).toBeDefined();

  // Verify build output files
  const handlerHashFiles = fs.readdirSync(path.join(buildPath, handlerHash));
  expect(handlerHashFiles).toHaveLength(2);
  expect(handlerHashFiles).toEqual(
    expect.arrayContaining(["lambda.js", "lambda.js.map"])
  );

  const srcHandlerHashFiles = fs.readdirSync(
    path.join(buildPath, srcHandlerHash, "src")
  );
  expect(srcHandlerHashFiles).toHaveLength(2);
  expect(srcHandlerHashFiles).toEqual(
    expect.arrayContaining(["srcLambda.js", "srcLambda.js.map"])
  );

  // Verify CF Lambda resource handler
  const cf = fs.readFileSync(
    path.join(
      buildPath,
      "cdk.out",
      "prod-nodejs-build-bundle-no-srcpath-sample.template.json"
    )
  );
  const cfnResources = JSON.parse(cf).Resources;
  const [cfnLambda1, cfnLambda2] = Object.values(cfnResources).filter(
    (r) => r.Type === "AWS::Lambda::Function"
  );
  expect(cfnLambda1.Properties.Handler).toEqual("lambda.handler");
  expect(cfnLambda2.Properties.Handler).toEqual("src/srcLambda.handler");

  // Verify CF Lambda asset files content
  const handlerAssets = cfnLambda1.Metadata["aws:asset:path"];
  const handlerZipFiles = fs.readdirSync(
    path.join(buildPath, "cdk.out", handlerAssets)
  );
  expect(handlerZipFiles).toHaveLength(2);
  expect(handlerZipFiles).toEqual(
    expect.arrayContaining(["lambda.js", "lambda.js.map"])
  );

  const srcHandlerAsset = cfnLambda2.Metadata["aws:asset:path"];
  const srcHandlerZipFiles = fs.readdirSync(
    path.join(buildPath, "cdk.out", srcHandlerAsset, "src")
  );
  expect(srcHandlerZipFiles).toHaveLength(2);
  expect(srcHandlerZipFiles).toEqual(
    expect.arrayContaining(["srcLambda.js", "srcLambda.js.map"])
  );
});
