class FailedTestsReporter {
  onRunComplete(_, results) {
    const failed = results.testResults.flatMap((suite) =>
      suite.testResults.filter((test) => test.status === "failed").map((test) => test.fullName),
    );

    if (failed.length) {
      console.log("\n=== FAILED TESTS ===");
      failed.forEach((name) => console.log(name));
    } else {
      console.log("\nNo failed tests 🎉");
    }
  }
}

module.exports = FailedTestsReporter;
