const spawn = require('child_process').spawn;
var path = require('path');
var log = require('fs');
var logfile = "./deployment_log.log";
var yaml = require('js-yaml');
var deployedAppModel=require("./deployedAppSchema.js");
var cloneGit = function(gitURL, dockerComposeCommand,socket,gitBranch){
	var cloneDirectoryPath = process.env.REPOSITORY_PATH;
	log.appendFile(logfile, 'CloneGit:REPOSITORY_PATH is:: ' +cloneDirectoryPath, function(error){
		if (error) return console.log(error);
	});

	var cloneParams = ['clone',gitURL];
	if(gitBranch) { cloneParams.push('-b'); cloneParams.push(gitBranch); }
	const gitCloneCommand = spawn('git',cloneParams, {cwd : cloneDirectoryPath});

	
	console.log("Current directory path is ", cloneDirectoryPath);
	var res = gitURL.split("/");
	var repoName = (res[res.length-1].split("."))[0];
	gitCloneCommand.stdout.on('data', (data) => {
		log.appendFile(logfile, 'CloneGit:Git clone from stdout:: '+data, function(error){
			if (error) return console.log(error);
		});
	});


	gitCloneCommand.stderr.on('data', (data) => {
		log.appendFile(logfile, 'CloneGit:Git clone from stderr:: '+data, function(error){
			if (error) return console.log(error);
			socket.emit("clone",{isComplete: false,isInProgress: true});
		});
	});


	gitCloneCommand.on('close', (code) => {
		console.log(`child process exited with code ${code}`);
		log.appendFile(logfile, "CloneGit:Done git clone\n", function(error){
			if (error) return console.log(error);
			console.log('CloneGit:Done git clone > logfile');
			socket.emit("clone",{isComplete: true,isInProgress: false});
		});	  
		dockerComposeCommand(path.resolve(cloneDirectoryPath,repoName),socket);
		storeService(repoName);
	});
}

var storeService=function(repoName){
	
	var yamldata=log.readFileSync(process.env.REPOSITORY_PATH+"/"+repoName+"/docker-compose.yml",{encoding: 'utf-8'});
	console.log(yamldata.toString());
	 obj = yaml.load(yamldata);
	 console.log(JSON.stringify(obj, null, 2));
		var objtoStore= Object.keys(obj.services)
	 console.log(Object.keys(obj.services));
	 
	 
	 var result = [];
	 
	 Object.keys(obj.services).map(function(data){
														var serviceObj={};
														console.log("service data ",data);
														serviceObj["serviceName"] = data;
														console.log("serviceObj",serviceObj);
														result.push(serviceObj);
												}
												
											);
	console.log("Service result ",result);
	 
	 var newUser  = deployedAppModel({
    		  appName: repoName,
    		  dns: '',
    		  services:  result
			  
	 });
			// Save the user details
    newUser.save(function(err) {
    		  if (err) throw err;
    		  console.log('User created!');
    		  });
	 
	 
}
	 

module.exports = cloneGit;