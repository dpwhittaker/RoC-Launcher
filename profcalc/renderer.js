const fs = require('fs');
const professions = require('./professions');
const skillNames = require('./skill_names');
const commands = require('./commands');
const commandDesc = require('./command_descriptions');
const statNames = require('./stat_names');

const buildsFile = require('os').homedir() + '/builds.json';
var builds = [];
if (fs.existsSync(buildsFile))
    builds = JSON.parse(fs.readFileSync(buildsFile));
function saveBuilds() {
    fs.writeFileSync(buildsFile, JSON.stringify(builds, null, 2));
}

function $(selector) {return document.querySelector(selector);}
function $$(selector) {return document.querySelectorAll(selector);}

const strings = {
    'outdoors': 'Outdoors',
    'force_sensitive': 'Force Sensitive',
    'force_discipline': 'Jedi',
    'force_rank': 'Force Rank',
    'force_title': 'Force Title',
    'shipwright': 'Shipwright',
    'crafting': 'Crafting'
}

var build = builds[0] || {
    learnedSkills: {},
    learnedProfs: {},
    pointsUsed: 0,
    selected: false
}
var buildIndex = 0;

var categories = [];
var profLists = {};
var skillLookup = {};

function renderBuilds() {
    $('#builds').innerHTML = '';
    for (let b in builds) {
        let div = document.createElement('div');
        div.className = `build ${builds[b].selected ? 'selected' : ''}`;
        div.innerHTML = `${builds[b].name}&nbsp;`;
        let span = document.createElement('span');
        span.innerHTML = '&#x2a2f';//X
        span.addEventListener('click', e => {
            builds.splice(b, 1);
            saveBuilds();
            renderBuilds();
        })
        div.appendChild(span);
        div.addEventListener('click', e => {
            for (let t of builds) t.selected = false;
            build = builds[b];
            build.selected = true;
            renderBuilds();
            var prof = "";
            for (p in build.learnedProfs) if (build.learnedProfs[p]) {prof = p; break;}
            selectProfession(prof);
            drawBuild();
            drawAllLists();
        })
        $('#builds').appendChild(div);
    }
    let div = document.createElement('div');
    div.className = 'build';
    div.innerHTML = '&#x2795;';
    div.addEventListener('click', e => {
        $('#overlay').style.display = 'block';
        $('#buildname').focus();
    })
    $('#builds').appendChild(div);
}

$('#buildname').addEventListener('keyup', e => {
    if (e.keyCode != 13) return;
    $('#overlay').style.display = 'none';
    for (let t of builds) t.selected = false;
    builds.push({name: e.target.value, learnedSkills:{}, learnedProfs:{}, pointsUsed: 0, selected: true});
    saveBuilds();
    renderBuilds();
    selectProfession("");
    drawBuild();
    drawAllLists();
});

renderBuilds();

for (let prof of professions) {
    let profList = profLists[prof.PARENT];
    if (!profList) {
        let div = document.createElement('div');
        div.className = 'category';
        div.innerHTML = `<div>${skillNames[prof.PARENT] || strings[prof.PARENT] || prof.PARENT}</div>`;
        $('#professions').appendChild(div);
        profList = document.createElement('ul');
        profList.className = 'proflist';
        div.appendChild(profList);
        profLists[prof.PARENT] = profList;
    }
    let li = document.createElement('li');
    li.innerHTML = skillNames[prof.NAME];
    li.addEventListener('click', e => selectProfession(prof.NAME));
    profList.appendChild(li);
    for (let skill of prof.skills) {
        skill.dependencies = [];
        skill.profession = prof.NAME;
        skillLookup[skill.NAME] = skill;
    }
}

for (let skillName in skillLookup) {
    let skill = skillLookup[skillName];
    for (let requires of skill.SKILLS_REQUIRED) {
        skillLookup[requires].dependencies.push(skill.NAME);
    }
}

var selectedProfession;
function selectProfession(name) {
    selectedProfession = name;
    $('#skilltitle').innerHTML = '';
    $('#commandlist').innerHTML = '';
    $('#skillmodlist').innerHTML = '';
    if (!name) {
        $('#title').innerHTML = '';
        $('#proftree').innerHTML = '';
        return;
    }
    var profession = professions.find(k => k.NAME == name);
    $('#title').innerHTML = skillNames[profession.NAME];
    drawTree($('#proftree'), profession, true);
    let div = document.createElement('div');
    div.className = 'pointsused';
    div.innerHTML = `Points Used: ${build.pointsUsed}<br/>Points Left: ${250-build.pointsUsed}`;
    $('#proftree').appendChild(div);
}

function drawTree(tree, profession, drawText) {
    tree.innerHTML = '';
    tree.className = profession.GRAPH_TYPE;
    for (let i in profession.skills) {
        let skill = profession.skills[i];
        let div = document.createElement('div');
        div.className = `skillbox box${i} ${build.learnedSkills[skill.NAME] ? 'learned': ''}`;
        if (drawText) {
            div.innerHTML = `${skillNames[skill.NAME]}<div class="points">${skill.POINTS_REQUIRED}</div>`;
            div.addEventListener('mouseover', e => selectSkill(skill));
            div.addEventListener('click', e => toggleSkill(skill));
        }
        tree.appendChild(div);
    }
}

var selectedSkill;
function selectSkill(skill) {
    selectedSkill = skill;
    $('#skilltitle').innerHTML = skillNames[skill.NAME];
    $('#commandlist').innerHTML = '';
    for (let command of skill.COMMANDS) {
        if (/^private_/.test(command)) continue;
        let li = document.createElement('li');
        li.innerHTML = commands[command.toLowerCase()] || command;
        $('#commandlist').appendChild(li);
    }
    $('#skillmodlist').innerHTML = '';
    for (let skillmod in skill.SKILL_MODS) {
        if (/^private_/.test(skillmod)) continue;
        let li = document.createElement('li');
        li.innerHTML = `${skill.SKILL_MODS[skillmod]} ${statNames[skillmod] || skillmod}`;
        $('#skillmodlist').appendChild(li);
    }
}

function toggleSkill(skill) {
    if (build.learnedSkills[skill.NAME]) unlearnSkill(skill.NAME);
    else learnSkill(skill.NAME);
    selectProfession(selectedProfession);
    drawBuild();
    drawAllLists();
}

function unlearnSkill(name, recursive) {
    if (!build.learnedSkills[name]) return;
    build.learnedSkills[name] = false;
    var skill = skillLookup[name];
    if (Object.keys(build.learnedSkills).every(s => !build.learnedSkills[s] || skillLookup[s].profession != skill.profession))
        build.learnedProfs[skill.profession] = false;
    build.pointsUsed -= skill.POINTS_REQUIRED;
    for (let dep of skill.dependencies) unlearnSkill(dep, true);
    if (!recursive) saveBuilds();
}

function learnSkill(name, recursive) {
    if (build.learnedSkills[name]) return true;
    var skill = skillLookup[name];
    for (let req of skill.SKILLS_REQUIRED) if (!learnSkill(req, true)) return false;
    if (build.pointsUsed + skill.POINTS_REQUIRED > 250) return false;
    build.pointsUsed += skill.POINTS_REQUIRED;
    build.learnedSkills[name] = true;
    if (professions.find(p => p.NAME == skill.PARENT)) build.learnedProfs[skill.PARENT] = true;
    if (!recursive) saveBuilds();
    return true;
}

function drawBuild() {
    $('#build').innerHTML = '';
    for (let prof of professions) {
        if (!build.learnedProfs[prof.NAME]) continue;
        let tree = document.createElement('div');
        drawTree(tree, prof, false);
        let caption = document.createElement('footer');
        caption.innerHTML = skillNames[prof.NAME];
        let div = document.createElement('div');
        div.className = 'minitree';
        div.appendChild(tree);
        div.appendChild(caption);
        div.addEventListener('click', e => selectProfession(prof.NAME));        
        $('#build').appendChild(div);
    }
}

function drawAllLists() {
    var allskills = {};
    var allcommands = {};
    var allcerts = {};
    for (let prof of professions) {
        for (let skill of prof.skills) {
            if (!build.learnedSkills[skill.NAME]) continue;
            for (let command of skill.COMMANDS) {
                if (/^private_/.test(command)) continue;
                if (/^cert_/.test(command))
                    allcerts[commands[command.toLowerCase()]] = true;
                else
                    allcommands[commands[command.toLowerCase()]] = true;
            }
            for (let mod in skill.SKILL_MODS) {
                if (/^private_/.test(mod)) continue;
                let modname = statNames[mod];
                if (!allskills[modname]) allskills[modname] = 0;
                allskills[modname] += skill.SKILL_MODS[mod];
            }
        }
    }
    $('#allcommandlist').innerHTML = '';
    for (let command in allcommands) {
        let li = document.createElement('li');
        li.innerHTML = command;
        $('#allcommandlist').appendChild(li);
    }
    $('#allskillmodlist').innerHTML = '';
    for (let mod of Object.keys(allskills).sort((a,b) => allskills[b] - allskills[a])) {
        let li = document.createElement('li');
        li.innerHTML = `${allskills[mod]} ${mod}`;
        $('#allskillmodlist').appendChild(li);
    }
    $('#allcertlist').innerHTML = '';
    for (let cert in allcerts) {
        let li = document.createElement('li');
        li.innerHTML = cert;
        $('#allcertlist').appendChild(li);
    }
}

var prof = "";
for (p in build.learnedProfs) if (build.learnedProfs[p]) {prof = p; break;}
selectProfession(prof);
drawBuild();
drawAllLists();
