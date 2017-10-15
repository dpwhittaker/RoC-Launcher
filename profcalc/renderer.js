const professions = require('./professions');
const skillNames = require('./skill_names');
const commands = require('./commands');
const commandDesc = require('./command_descriptions');
const statNames = require('./stat_names');

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

var learnedSkills = {};
var learnedProfs = {};
var pointsUsed = 0;

var categories = [];
var profLists = {};
var skillLookup = {};

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
    var profession = professions.find(k => k.NAME == name);
    $('#title').innerHTML = skillNames[profession.NAME];
    drawTree($('#proftree'), profession, true);
}

function drawTree(tree, profession, drawText) {
    tree.innerHTML = '';
    tree.className = profession.GRAPH_TYPE;
    for (let i in profession.skills) {
        let skill = profession.skills[i];
        let div = document.createElement('div');
        div.className = `skillbox box${i} ${learnedSkills[skill.NAME] ? 'learned': ''}`;
        if (drawText) {
            div.innerHTML = skillNames[skill.NAME];
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
        let div = document.createElement('div');
        div.innerHTML = commands[command.toLowerCase()] || command;
        $('#commandlist').appendChild(div);
    }
    $('#skillmodlist').innerHTML = '';
    for (let skillmod in skill.SKILL_MODS) {
        if (/^private_/.test(skillmod)) continue;
        let div = document.createElement('div');
        div.innerHTML = `${skill.SKILL_MODS[skillmod]} ${statNames[skillmod] || skillmod}`;
        $('#skillmodlist').appendChild(div);
    }
}

function toggleSkill(skill) {
    if (learnedSkills[skill.NAME]) unlearnSkill(skill.NAME);
    else learnSkill(skill.NAME);
    selectProfession(selectedProfession);
    drawBuild();
    drawAllLists();
}

function unlearnSkill(name) {
    if (!learnedSkills[name]) return;
    learnedSkills[name] = false;
    var skill = skillLookup[name];
    if (Object.keys(learnedSkills).every(s => !learnedSkills[s] || skillLookup[s].profession != skill.profession))
        learnedProfs[skill.profession] = false;
    pointsUsed -= skill.POINTS_REQUIRED;
    for (let dep of skill.dependencies) unlearnSkill(dep);
}

function learnSkill(name) {
    if (learnedSkills[name]) return true;
    var skill = skillLookup[name];
    for (let req of skill.SKILLS_REQUIRED) if (!learnSkill(req)) return false;;
    if (pointsUsed + skill.POINTS_REQUIRED > 250) return false;
    pointsUsed += skill.POINTS_REQUIRED;
    learnedSkills[name] = true;
    if (professions.find(p => p.NAME == skill.PARENT)) learnedProfs[skill.PARENT] = true;
    return true;
}

function drawBuild() {
    $('#build').innerHTML = '';
    for (let prof of professions) {
        if (!learnedProfs[prof.NAME]) continue;
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
    let div = document.createElement('div');
    div.className = 'pointsused';
    div.innerHTML = `Points Used: ${pointsUsed}<br/>Points Left: ${250-pointsUsed}`;
    $('#proftree').appendChild(div);
}

function drawAllLists() {
    var allskills = {};
    var allcommands = {};
    var allcerts = {};
    for (let prof of professions) {
        for (let skill of prof.skills) {
            if (!learnedSkills[skill.NAME]) continue;
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