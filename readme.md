# java-test [![Build Status](https://travis-ci.org/itaisteinherz/java-test.svg?branch=master)](https://travis-ci.org/itaisteinherz/java-test)

> Java testing utility


## Why

- Lints code using [CheckStyle](https://github.com/checkstyle/checkstyle).
- Runs the tests.
- Compares the tests' output to expected output and highlights differences.
- Fix issues automagically with `$ java-test --fix` (using [Google's source code formatter](https://github.com/google/google-java-format)).


## Install

```
$ npm install --global https://github.com/itaisteinherz/java-test
```


## Usage

```
$ java-test --help

  Usage
    $ java-test <file> [<tests> <tests_output>]

  Options
    --fix      Automagically fix issues
    --sun      Use the Sun CheckStyle config (Google's is used by default)

  Examples
    $ java-test HelloWorld.java
    $ java-test HelloWorld.java HelloWorldTests.java HelloWorldTests-output.java
```


## License

MIT © [Itai Steinherz](https://github.com/itaisteinherz)
