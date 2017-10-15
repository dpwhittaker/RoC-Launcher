const fs = require("fs");

var skillsCSV = fs.readFileSync("skills.csv", 'utf-8');

var lines = skillsCSV.split(/\r?\n/g);
var rows = [];
for (var line of lines) {
    rows.push(line.split(', '));
}

var header = rows.shift();

var skills = [];
var professions = [];
var god = [];
var hidden = [];
for (var row of rows) {
    var skill = {};
    for (var i in header) {
        if (row[i] == '') continue;
        skill[header[i]] = row[i];
        if (/^[0-9]+$/.test(row[i])) skill[header[i]] = +row[i];
        if (/^(True|False)$/.test(row[i])) skill[header[i]] = row[i] == 'True';
    }
    var mods = {};
    if (skill.SKILL_MODS) {
        for (var mod of skill.SKILL_MODS.split(',')) {
            var parts = mod.split('=');
            mods[parts[0]] = +parts[1];
        }
    }
    skill.SKILL_MODS = mods;
    skill.COMMANDS = skill.COMMANDS ? skill.COMMANDS.split(',') : [];
    skill.SKILLS_REQUIRED = skill.SKILLS_REQUIRED ? skill.SKILLS_REQUIRED.split(',') : [];
    if (skill.GOD_ONLY) god.push(skill);
    else if (skill.IS_HIDDEN) hidden.push(skill);
    else if (skill.IS_PROFESSION) professions.push(skill);
    else skills.push(skill);
}
for (var prof of professions) {
    prof.skills = [];
    function addChild(parent) {
        for (var skill of skills) {
            if (skill.PARENT == parent) {
                prof.skills.push(skill);
                addChild(skill.NAME);
            }
        }
    }
    addChild(prof.NAME);
}
fs.writeFileSync("professions.json", JSON.stringify(professions, null, 2));

