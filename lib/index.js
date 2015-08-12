/**
 * Created by Ali on 7/29/2015.
 */
"use strict";

var spawn = require("child_process").spawn,
    exec = require("child_process").exec,
    os = require("os"),
    Q = require("q"),
    fs = require("fs"),
    path = require("path");

var clonedRepositoryReady = false;
var _0755 = parseInt('0755', 8) & (~process.umask());


var defaultConfig = {
    repository: {
        git_cmd_path: "git",
        git_repository_uri: "git@github.com:gaaiatinc/git-job-queue.git",
        clone_dir: "./TestRepo",
        git_remote_name: "origin",
        git_branch: "master"
    },
    instanceId: "git_job_queue",
    persistent: false,
    maxSize: 1000,
    heartbeatMillis: 4000,
    consoleLog: true
};

var jobQueue;
var repoConfig = defaultConfig;
var gitCmdOpts;


/**
 *
 * @param config
 */
function init(config) {
    return Q.Promise(function (resolve, reject) {
        repoConfig = config || defaultConfig;
        gitCmdOpts = {
            cwd: path.posix.normalize(repoConfig.repository.clone_dir),
            encoding: "utf8"
        };

        jobQueue = require("async-job-queue")(repoConfig, __gitJobExecutor);
        jobQueue.init(resolve);
    });
}


/**
 *
 * @param gitCmdArgArray
 * @returns {*}
 * @private
 */
function __gitJobExecutor(gitCmdArgArray) {
    return Q.Promise(function (resolve, reject) {
        if (!Array.isArray(gitCmdArgArray)) {
            reject(new Error("argeuments must be an array."));
        }

        var gitCommandWithArgs = "git " + gitCmdArgArray.join(" ");

        Q.nfcall(exec, gitCommandWithArgs, gitCmdOpts)
            .then(function (results) {
                console.log("executed:", gitCommandWithArgs);
                return resolve(results[0]);
            }, reject)
            .catch(reject)
            .done();
    });
}


/**
 * tests the following and returns true if any condition is unmet
 * 1.) configured repoURI matches repoURI on disk
 * 2.) configured remoteName matches remoteName on disk
 * 3.) configured branch matches branch on disk
 *
 */
function testRepoOnDisk() {

    /**
     *
     * @returns {*}
     */
    function checkGitFolderExists() {
        return Q.Promise(function (resolve, reject) {
            Q.nfcall(fs.stat, repoConfig.repository.clone_dir + "/.git")
                .then(function (stats) {
                    if (stats && stats.isDirectory()) {
                        resolve();
                    } else {
                        reject(new Error("no .git folder exists in the clone folder!"));
                    }
                }, reject)
                .catch(function (err) {
                    reject(err);
                })
                .done();
        });
    }


    /**
     *
     * @returns {*}
     */
    function checkRemote() {
        return Q.Promise(function (resolve, reject) {
            jobQueue.pushJob(["remote", "-v"])
                .then(function (output) {
                    var elems, idx;
                    if (output.trim()) {
                        elems = output.trim().split(/[\s]+/);
                        for (idx = 0; (idx + 2) < elems.length; idx += 3) {
                            if ((elems[idx + 2] === "(fetch)")
                                && (elems[idx] === repoConfig.repository.git_remote_name)
                                && (elems[idx + 1] === repoConfig.repository.git_repository_uri)) {
                                return resolve();
                            }
                        }
                    }
                    return reject(new Error("Could not find a matching remote name: " + repoConfig.repository.git_remote_name));
                }, reject)
                .done();
        });
    }


    /**
     *
     */
    function checkBranch() {
        return Q.Promise(function (resolve, reject) {
            jobQueue.pushJob(["symbolic-ref", "HEAD"])
                .then(function (output) {
                    var outputBranch = output;

                    if (output) {
                        outputBranch = output.trim().replace("refs/heads/", "");
                        if (outputBranch === repoConfig.repository.git_branch) {
                            clonedRepositoryReady = true;
                            return resolve();
                        }
                    }

                    return reject(new Error("Configured branch: " + repoConfig.repository.git_branch + " doesn't match branch on disk:", outputBranch));
                }, reject)
                .done();
        });
    }


    return [checkGitFolderExists, checkRemote, checkBranch].reduce(Q.when, Q());
}


/**
 *
 */
function cleanContentRepoFolder() {

    return Q.Promise(function (resolve, reject) {

        if (clonedRepositoryReady) {
            return resolve();
        }

        var contentRepoCloneFolder = path.posix.normalize(repoConfig.repository.clone_dir);

        makeRepoDir()
            .finally(function () {
                [removeRepoDir, makeRepoDir].reduce(Q.when, Q())
                    .then(resolve, reject)
                    .done();
            });

        /**
         *
         * @param callback
         */
        function removeRepoDir() {
            var rmrfUnixCmd = "rm -rf ",
                rmrfWinCmd = "rmdir /S /Q ",
                rmrfCmd = os.platform() === "win32" ? rmrfWinCmd : rmrfUnixCmd;

            return Q.nfcall(exec, rmrfCmd + path.resolve(contentRepoCloneFolder));
        }

        /**
         *
         * @returns {*}
         */
        function makeRepoDir() {
            return Q.nfcall(fs.mkdir, contentRepoCloneFolder, _0755);
        }
    });
}

/**
 *
 */
function cloneRepository() {
    /**
     *
     * @returns {*}
     * @private
     */
    function __cloneRepository() {
        return Q.Promise(function (resolve, reject) {

            if (clonedRepositoryReady) {
                return resolve();
            }

            var cloneCommandArgs = ["clone", "-b", repoConfig.repository.git_branch, repoConfig.repository.git_repository_uri, "./"];

            jobQueue.pushJob(["clone", "-b", repoConfig.repository.git_branch, repoConfig.repository.git_repository_uri, "./"])
                .then(function (results) {
                    clonedRepositoryReady = true;
                    return resolve(results);
                }, reject)
                .done();
        });
    }

    return [cleanContentRepoFolder, __cloneRepository].reduce(Q.when, Q());
}


/**
 *
 * @param gitCmdArgArr
 * @private
 */
function __scheduleGitCommand(gitCmdArgArr) {
    return jobQueue.pushJob(gitCmdArgArr);
}


/**
 *
 * @private
 */
function __listModifiedUpstreamFiles() {
    jobQueue.pushJob(["fetch"]);

    var logCommandArgs = ["log", "--name-only", "--oneline", "HEAD.." + repoConfig.repository.git_remote_name + "/" + repoConfig.repository.git_branch];
    return jobQueue.pushJob(logCommandArgs);
}


/**
 *
 *
 */
module.exports = {
    init: init,
    cleanRepositoryFolder: cleanContentRepoFolder,
    testRepository: testRepoOnDisk,
    cloneRepository: cloneRepository,
    listModifiedUpstreamFiles: __listModifiedUpstreamFiles,
    scheduleGitCommand: __scheduleGitCommand
};



