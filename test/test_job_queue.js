/**
 * Created by aismael on 1/3/14.
 */
'use strict';

var assert = require('assert');

var path = require('path');

var exec = require("child_process").exec;


var job_queue_1 = require("../lib/index");

var repoConfig = {
    repository: {
        git_cmd_path: "c:\\Program Files (x86)\\Git\\bin\\git.exe",
        git_repository_uri: "git@github.com:gaaiatinc/async-job-queue.git",
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


function dummyExecutor(aJob) {
    //console.log(">>>> dummy executor", aJob.toString());
}
/**
 *
 */
describe('job-queue', function () {


    before(function (done) {
        //


        var appRoot = path.resolve('.');
        var basedir = path.join(appRoot, 'config');

        //confit(basedir).create(function (err, config) {
        //
        //    var appConfig = require("../../lib/util/app_config");
        //    appConfig.init(config);
        //
        //    job_queue.init();
        //
        //    //console.log(config);
        //
        //    done();
        //
        //});

        job_queue_1.init(repoConfig)
            .then(done)
            .finally(done);
    });


    /**
     *
     */
    after(function () {

    });

    /**
     *
     */
    beforeEach(function () {

    });

    /**
     *
     */
    afterEach(function () {

    });


    /**
     *
     */
    describe('GitJobQueue Performance test', function () {

        //it("original code", function (done) {
        //
        //    var remoteName = "origin";
        //    var repoURI = "git@github.com:gaaiatinc/git-job-queue.git";
        //
        //    (function checkRemote() {
        //        exec("git remote -v", {cwd: "./TestRepo"}, function (gitErr, output) {
        //            console.log("output:", output);
        //
        //            var elems, idx;
        //            if (gitErr) {
        //                logger.warn("Could not check for repo consistency:", gitErr);
        //                return done();
        //            } else {
        //                if (output) {
        //                    elems = output.trim().split(/[\s]+/);
        //                    for (idx = 0; (idx + 2) < elems.length; idx += 3) {
        //                        if (elems[idx + 2] === "(fetch)" && elems[idx] === remoteName && elems[idx + 1] === repoURI) {
        //                            return done();
        //                        }
        //                    }
        //                }
        //                console.log("Could not find a matching remote name:", remoteName);
        //                return done();
        //            }
        //        });
        //    }());
        //});

        it('should clean git repository without error', function (done) {

            job_queue_1.cleanRepositoryFolder()
                .then(function () {
                    console.log("repository is wipedout:");
                })
                .catch(function (err) {
                    console.log(err);
                })
                .finally(function () {
                    done();
                });

        });


        it('should clone git repository without error', function (done) {

            job_queue_1.cloneRepository()
                .then(function () {
                    console.log("repository is cloned:");
                })
                .catch(function (err) {
                    console.log(err);
                })
                .finally(function () {
                    done();
                });

        });

        it('should test git repository without error', function (done) {

            job_queue_1.testRepository()
                .then(function () {
                    console.log("repository is ok:");
                })
                .catch(function (err) {
                    console.log(err);
                })
                .finally(function () {
                    done();
                });

        });

        it('should schedule a git command without error', function (done) {

            job_queue_1.scheduleGitCommand(["log", "-5"])
                .then(function (results) {
                    console.log("repository is ok, last few logs:", results);
                })
                .catch(function (err) {
                    console.log(err);
                })
                .finally(function () {
                    done();
                });

        });

        it('should list modified upstream files without error', function (done) {

            job_queue_1.listModifiedUpstreamFiles()
                .then(function (results) {
                    console.log("repository is ok, modified upstream files:", results);
                })
                .catch(function (err) {
                    console.log(err);
                })
                .finally(function () {
                    done();
                });

        });
    });
});
