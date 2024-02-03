/** A vanillaJS implementation of a simple terminal.
 *
 * These are the only "standard" features supported in the terminal as of
 * yet:
 * - Immutable history and prompt.
 * - ASCII colors.
 *
 * @author M. Yas. Davoodeh
 * @license Apache-2.0
 * @module
 */

/** Defines a command in the shell(without a name).
 *
 * @typedef {Object} Command
 * @property {?string} summary - One line (less than 80 character) description.
 * @property {?string} description - Long descriptions.
 * @property {?callback} callback - A function with an `addText` function to put
 *   their output to and many inputs all string which returns an integer as exit
 *   code.
 */

/** A map from a string to another.
 *
 * @typedef {Object} Alias
 * @property {?string} summary - One line (less than 80 character) description.
 * @property {?string} description - Long descriptions.
 * @property {!string} destination - another.
 */

/** The "program" list for the shell.
 *
 * @typedef {Object} Shell
 * @property {Object.<string, Command>} commands - Commands in the shell. There
 *   are a minimum of commands which are guaranteed to exist. They are as in the
 *   list:
 *   - `help` for listing all the commands.
 * @property {Object.<string, Alias>} aliases - The list of aliases.
 */
// TODO
// future built-ins: `version` for information about the terminal, `js` for
// evaluating JS code, `cd` (fetch) for calling on `paths` and `login`
// * @property {Object.<string, Path>} paths - The remote directory and resources.

/** @type {Shell} */
var $shell = {
    commands: {
        help: {
            summary: 'Print user critical informations for one or all programs',
            description:
                'Innerworkings of the system and techincal aspects of the shell are not listed\n'
                + 'here.',
            callback: (addText, ...args) => {
                let exit = 0;
                if (args[0] !== undefined) {
                    const o =
                        $shell.aliases[args[0]] ? $shell.aliases[args[0]] :
                            $shell.commands[args[0]] ? $shell.commands[args[0]] :
                                undefined;
                    if (o === undefined) {
                        addText(`There is no help document for: ${args[0]}\n\n`);
                        exit = 2;
                    } else {
                        addText("Run help without a parameter to see all commands.\n\n");
                        addText(`${args[0]}:\n\t${o.summary}\n`);
                        if (o.description != '') {
                            addText(`\n${o.description}\n`);
                        }
                        return 0;
                    }
                }

                let summaries = 'Here are a list of commands available in this shell\n\n'
                    + 'Run with one parameter to get detailed information about a subject.\n\n';
                for (const cmd in $shell.aliases) {
                    let dest = $shell.aliases[cmd].destination;
                    if (dest.startsWith('echo')) {
                        dest = 'echo "[trimmed]"';
                    }
                    summaries += `[96m${cmd}[0m\n\t${$shell.aliases[cmd].summary}\n`
                        + `\t[alias: \`[36m${dest}[0m\`]\n`;
                }
                for (const cmd in $shell.commands) {
                    summaries += `[36m${cmd}[0m\n\t${$shell.commands[cmd].summary}\n`;
                }
                addText(summaries);
                return exit;
            }
        },
        newtab: {
            summary: 'Open the given URI in a new tab',
            description: 'A simple JS redirect to another page.',
            callback: (addText, ...args) => {
                const uri = args[0];
                if (!uri || uri.length === 0) {
                    addText("error: Give a URI\n");
                    return 2;
                }

                addText(`Openning ${uri}...\n`);
                window.open(uri)
                return 0;
            }
        },
        echo: {
            summary: "Print the exact text back",
            description: "A bootleg echo command only supporting literals.\n"
                + "Escapes '\\n'.",
            callback: (addText, ...args) => {
                let s = '';
                for (let i of args) {
                    s += i.replace('\\n', '\n') + ' ';
                }
                s += '\n';
                addText(s);
                return 0;
            }
        }
    },
    aliases: {
        linkedin: {
            summary: "My LinkedIn profile",
            description: "See my resume by running 'resume' or message me by 'telegram'",
            destination: "newtab https://LinkedIn.com/in/Davoodeh",
        },
        telegram: {
            summary: "My Telegram for direct messaging",
            description: "",
            destination: "newtab https://t.me/Davoodeh",
        },
        resume: {
            summary: "PDF of my resume",
            description: "",
            destination: "echo Currently as it is on Github, simply contact me for that.",
        },
        about: {
            summary: "Learn more about the terminal",
            description: "",
            destination: 'echo This terminal is a dependency free VanillaJS, a prototype implemented in\n' +
                'course of a weekend. This is to be rewritten in Rust WASM and its main feature\n' +
                '(to be implemented) will be compatiblity with OpenAPI. As of yet, this is not\n' +
                'in an standalone repository as I believe it is not a code ready for reading.\n' +
                '\n' +
                'However, here are some features that I think are worth mentioning about it:\n' +
                '- Animation system, the loading and other gradual "typing" stuff are all\n' +
                '  actually just animations.\n' +
                '- Support for ANSI escape sequences! [31mC[32mO[33mL[34mO[35mR[36mS[0m!\n' +
                '  Go ahead try it... Echo something colorful (or see the source code)! The\n' +
                '  colors typed here are generated by terminal automatically. Isn\'t it just\n' +
                '  beautiful?!\n' +
                '- Commands and aliases (nothing so new there)\n' +
                '- Theme support and hot theme reload!\n' +
                '- Fast and light! It\'s just a couple of lines without any dependencies!',
        },
        man: {
            summary: "Same as help.",
            description: "",
            destination: "help",
        }
    }
};

const ERRORS = {
    1: "generic error",
    2: "invalid inputs",
    126: "command cannot be executed (do you have permission? log in)",
    127: "command not found (type 'help' for list of commands)",
    // 130: "SIGINT: command interrupted (by user probably)",
};


// Globals
/** The string representing the prompt.
 *
 * @global
 */
var $prompt = '❯ ';

/** The banner at the beginning of every session.
 *
 * @global
 */
const BANNER = '' +
    '                            [38;5;255m,_ ,_==▄▂[0m\n' +
    '                         [38;5;255m,  ▂▃▄▄▅▅[48;5;240m▅[48;5;20m▂[48;5;240m▅¾[0m.            [38;5;199m/    [38;5;20m/[0m\n' +
    '                          [38;5;255m[48;5;20m▄[0m[38;5;255m[48;5;199m▆[38;5;16m[48;5;255m<´  [38;5;32m"[38;5;34m»[38;5;255m▓▓[48;5;32m▓[48;5;240m%[0m\       [38;5;199m/ [38;5;20m/   [38;5;45m/ [38;5;118m/[0m\n' +
    '                        [38;5;255m,[38;5;255m[48;5;240m▅[38;5;16m[48;5;255m7"     [38;5;160m´[38;5;34m>[38;5;255m[48;5;39m▓▓[38;5;199m[48;5;255m▓[0m[38;5;255m%   [38;5;20m/  [38;5;118m/ [38;5;199m> [38;5;118m/ [38;5;199m>[38;5;255m/[38;5;45m%[0m\n' +
    '                        [38;5;255m▐[48;5;240m[38;5;255m¶[48;5;240m[38;5;255m▓[48;5;255m       [38;5;196m,[38;5;34m»[48;5;201m[38;5;255m▓▓[0m[38;5;255m¾´[0m  [38;5;199m/[38;5;255m> %[38;5;199m/[38;5;118m%[38;5;255m/[38;5;199m/ [38;5;45m/  [38;5;199m/[0m\n' +
    '                         [38;5;255m[48;5;240m▓[48;5;255m[38;5;16m▃[48;5;16m[38;5;255m▅▅[38;5;16m[48;5;255m▅▃,,[38;5;32m▄[38;5;16m▅[38;5;255m[48;5;16m▅▅[38;5;255m[48;5;20mÆ[0m[38;5;255m\[0m[38;5;20m/[38;5;118m/[38;5;255m /[38;5;118m/[38;5;199m/[38;5;255m>[38;5;45m[38;5;255m/[38;5;118m>[38;5;199m/   [38;5;20m/[0m\n' +
    '                        [48;5;20m[38;5;255mV[48;5;255m[38;5;16m║[48;5;20m[38;5;255m«[0m[38;5;255m¼.;[48;5;240m[38;5;255m→[48;5;255m[38;5;16m ║[0m[38;5;255m<«.,[48;5;25m[38;5;255m`[48;5;240m=[0m[38;5;20m/[38;5;199m/ [38;5;255m/>[38;5;45m/[38;5;118m/[38;5;255m%/[38;5;199m% / [38;5;20m/[0m\n' +
    '                        [38;5;20m[48;5;255m[38;5;16m╠<´ -²,)[48;5;16m[38;5;255m(▓[48;5;255m[38;5;16m~"-[38;5;199m╝/[0m[38;5;255m¾[0m[38;5;199m/ [38;5;118m%[38;5;255m/[38;5;118m>[38;5;45m/ [38;5;118m/[38;5;199m>[0m\n' +
    '                  [38;5;20m/ / [38;5;118m/ [48;5;20m[38;5;255m▐[48;5;240m[38;5;16m%[48;5;255m -./▄▃▄[48;5;16m[38;5;255m▅[48;5;255m[38;5;16m▐[48;5;255m[38;5;16m, [38;5;199m/[48;5;199m[38;5;255m7[0m[38;5;20m/[38;5;199m/[38;5;255m;/[38;5;199m/[38;5;118m% [38;5;20m/ /[0m\n' +
    '                  [38;5;20m/ [38;5;199m/[38;5;255m/[38;5;45m/[38;5;118m/[38;5;255m[48;5;240m`[48;5;20m[38;5;255m▌[48;5;20m[38;5;255m▐[48;5;255m[38;5;16m %z[0m[38;5;255mWv xX[48;5;20m[38;5;255m▓[48;5;34m[38;5;255m▇[48;5;199m[38;5;255m▌[0m[38;5;20m/[38;5;199m/[38;5;255m&;[38;5;20m% [38;5;199m/ [38;5;20m/[0m\n' +
    '              [38;5;20m/ / [38;5;255m/ [38;5;118m%[38;5;199m/[38;5;255m/%/[48;5;240m[38;5;255m¾[48;5;255m[38;5;16m½´[38;5;255m[48;5;16m▌[0m[38;5;246m▃▄[38;5;255m▄▄[38;5;246m▄▃▃[0m[48;5;16m[38;5;255m▐[38;5;255m[48;5;199m¶[48;5;20m[38;5;255m\[0m[38;5;20m/[0m[48;5;255m[38;5;240m&[0m [38;5;20m/[0m\n' +
    '                [38;5;199m<[38;5;118m/ [38;5;45m/[38;5;255m</[38;5;118m%[38;5;255m/[38;5;45m/[38;5;255m`[48;5;16m▓[48;5;255m[38;5;16m![48;5;240m[38;5;255m%[48;5;16m[38;5;255m▓[0m[38;5;255m%[48;5;240m[38;5;255m╣[48;5;240m[38;5;255m╣[0m[38;5;255mW[0m[38;5;250mY<Y)[48;5;255m[38;5;16my&[0m[38;5;255m/`[48;5;240m\[0m\n' +
    '            [38;5;20m/ [38;5;199m/ [38;5;199m%[38;5;255m/%[38;5;118m/[38;5;45m/[38;5;255m<[38;5;118m/[38;5;199m%[38;5;45m/[38;5;20m/[48;5;240m[38;5;255m\[38;5;16m[48;5;255mi7; ╠N[0m[38;5;246m>[38;5;255m)VY>[48;5;240m[38;5;255m7[0m[38;5;255m;  [38;5;255m[48;5;240m\[0m[38;5;255m_[0m\n' +
    '         [38;5;20m/   [38;5;255m/[38;5;118m<[38;5;255m/ [38;5;45m/[38;5;255m/<[38;5;199m/[38;5;20m/[38;5;199m/[38;5;20m<[38;5;255m_/%\[38;5;255m[48;5;16m▓[48;5;255m[38;5;16m  V[0m[38;5;255m%[48;5;255m[38;5;16mW[0m[38;5;255m%£)XY[0m  [38;5;240m_/%[38;5;255m‾\_,[0m\n' +
    '          [38;5;199m/ [38;5;255m/ [38;5;199m/[38;5;255m/[38;5;118m%[38;5;199m/[48;5;240m[38;5;255m_,=-[48;5;20m-^[0m[38;5;255m/%/%%[48;5;255m[38;5;16m\¾%[0m[38;5;255m¶[0m[48;5;255m[38;5;16m%[0m[38;5;255m%}[0m    [38;5;240m/%%%[38;5;20m%%[38;5;240m%;\,[0m\n' +
    '           [38;5;45m%[38;5;20m/[38;5;199m< [38;5;20m/[48;5;20m[38;5;255m_/[48;5;240m [0m[38;5;255m%%%[38;5;240m%%[38;5;20m;[38;5;255mX[38;5;240m%[38;5;20m%[38;5;255m\%[38;5;240m%;,     _/%%%;[38;5;20m,[38;5;240m     \[0m\n' +
    '          [38;5;118m/ [38;5;20m/ [38;5;240m%[38;5;20m%%%%[38;5;240m%;,    [38;5;255m\[38;5;240m%[38;5;20m%[38;5;255ml[38;5;240m%%;_/[38;5;20m%;,[0m [38;5;234mdmr[0m\n' +
    '        [38;5;20m/    [38;5;240m%[38;5;20m%%;,[0m         [38;5;255m<[38;5;20m;[38;5;240m\-=-/ /[0m\n' +
    '            [38;5;20m;,[0m                [38;5;240ml[0m\n' +
    '        \n' +
    '                     [38;5;255mUNIX IS VERY SIMPLE [38;5;45mIT JUST NEEDS A[0m\n' +
    '                [38;5;45mGENIUS TO UNDERSTAND ITS SIMPLICITY[38;5;255m[0m\n' +
    '        \n\n';


// 80 character limit
const LOADING = [
    "Yet figuring it out (loading)...",
    "..............", "", "", "", "", "...............",
    ".", ".", ".", ".", ".", "..............\n\n",
];

/** The initial message of every session.
 *
 * @global
 */
// 80 character limit
const INTRO = [
    "", "", "", "",
    // greetings
    "Hello", ".", ".", ".\n",
    "I'm M. Yas. [31mDavoodeh[0m", ".", ".", ".\n\n",
    // intro
    "Welcome to my personal website where I post my thoughts, resume and other\n"
    + "stuff!\n\n",
    // "automatically generated by some OpenAPI manifest...\n",
    "In the most generic and brief, I'm a Bachelor in Software Engineering hanging in\n"
    + "top universities of my region with work experience mostly in Rust, about\n"
    + "monitoring platform backends and libraries for some big local tech companies.\n"
    + "Oh, and I love games!\n\n"
    + "As of now, there is not much going on here. I just made this terminal in\n"
    + "a weekend and didn't have time to populate the site. The books I read,\n"
    + "software I work on, maybe my devlog and some sort of news feed will shortly\n"
    + "come to the site.\n\n"
    + "The website is different right? This is a side project of mine... Gotta\n"
    + "put use your command line skills to work here... (type 'about' for more\n"
    + "information about the website)\n\n",
    // "alternatively, just use curl or a script generated safely with helpers" +
    // "to get the same experience without a bloat of a JS browser..."
    // Outro
    "Here is a list of commands (type 'help' to see this again)...\n",
];

/** Create an element using JS.
 *
 * @param {string} tagName - Tag name of the element.
 * @param {HTMLElement | null} host - The place the value will be appended to.
 * @param {string | null} id - The ID of the tag.
 * @returns {HTMLElement} - The newly created tag.
 */
function createElement(
    tagName,
    host = null,
    id = null,
) {
    let el = document.createElement(tagName);
    if (id) {
        el.id = id;
    }
    if (host) {
        host.appendChild(el);
    }
    return el;
}

/** A terminal Theme specification.
 *
 * @typedef {Object} Palette
 * @property {string} Black - CSS color for ANSI black (`term-(bg|fg)-black` in
 *   CSS).
 * @property {string} Red - CSS color for ANSI red (`term-(bg|fg)-red` in CSS).
 * @property {string} Green - CSS color for ANSI green (`term-(bg|fg)-green` in
 *   CSS).
 * @property {string} Yellow - CSS color for ANSI yellow (`term-(bg|fg)-yellow`
 *   in CSS).
 * @property {string} Blue - CSS color for ANSI blue (`term-(bg|fg)-blue` in
 *   CSS).
 * @property {string} Magenta - CSS color for ANSI magenta
 *   (`term-(bg|fg)-magenta` in CSS).
 * @property {string} Cyan - CSS color for ANSI cyan (`term-(bg|fg)-cyan` in
 *   CSS).
 * @property {string} White - CSS color for ANSI white (`term-(bg|fg)-white` in
 *   CSS).
 * @property {string} BrightBlack - CSS color for ANSI bright black
 *   (`term-(bg|fg)-bright-black` in CSS).
 * @property {string} BrightRed - CSS color for ANSI bright red
 *   (`term-(bg|fg)-bright-red` in CSS).
 * @property {string} BrightGreen - CSS color for ANSI bright green
 *   (`term-(bg|fg)-bright-green` in CSS).
 * @property {string} BrightYellow - CSS color for ANSI bright yellow
 *   (`term-(bg|fg)-bright-yellow` in CSS).
 * @property {string} BrightBlue - CSS color for ANSI bright blue
 *   (`term-(bg|fg)-bright-blue` in CSS).
 * @property {string} BrightMagenta - CSS color for ANSI bright magenta
 *   (`term-(bg|fg)-bright-magenta` in CSS).
 * @property {string} BrightCyan - CSS color for ANSI bright cyan
 *   (`term-(bg|fg)-bright-cyan` in CSS).
 * @property {string} BrightWhite - CSS color for ANSI bright white
 *   (`term-(bg|fg)-bright-white` in CSS).
 */

/** Theme CSS classes given by theme JS class.
 *
 * The implementor must not act when the value is undefined and when the value
 * is just null, must set to the default.
 *
 * @typedef {Object} ElementTheme
 * @property {string | null | undefined} bg - CSS class for background.
 * @property {string | null | undefined} fg - CSS class for foreground.
 * @property {string | null | undefined} font - CSS class for font.
 * @property {string | null | undefined} style - Miscellaneous CSS style.
 */

/** ANSI Color names in order of definition X0 to X7. */
const COLORS = [
    'Black',
    'Red',
    'Green',
    'Yellow',
    'Blue',
    'Magenta',
    'Cyan',
    'White',
];

/** ANSI Color cube from 16 to 255 color. */
const COLOR_CUBE = [
    "#000000", "#00005f", "#000087", "#0000af", "#0000d7", "#0000ff", "#005f00",
    "#005f5f", "#005f87", "#005faf", "#005fd7", "#005fff", "#008700", "#00875f",
    "#008787", "#0087af", "#0087d7", "#0087ff", "#00af00", "#00af5f", "#00af87",
    "#00afaf", "#00afd7", "#00afff", "#00d700", "#00d75f", "#00d787", "#00d7af",
    "#00d7d7", "#00d7ff", "#00ff00", "#00ff5f", "#00ff87", "#00ffaf", "#00ffd7",
    "#00ffff", "#5f0000", "#5f005f", "#5f0087", "#5f00af", "#5f00d7", "#5f00ff",
    "#5f5f00", "#5f5f5f", "#5f5f87", "#5f5faf", "#5f5fd7", "#5f5fff", "#5f8700",
    "#5f875f", "#5f8787", "#5f87af", "#5f87d7", "#5f87ff", "#5faf00", "#5faf5f",
    "#5faf87", "#5fafaf", "#5fafd7", "#5fafff", "#5fd700", "#5fd75f", "#5fd787",
    "#5fd7af", "#5fd7d7", "#5fd7ff", "#5fff00", "#5fff5f", "#5fff87", "#5fffaf",
    "#5fffd7", "#5fffff", "#870000", "#87005f", "#870087", "#8700af", "#8700d7",
    "#8700ff", "#875f00", "#875f5f", "#875f87", "#875faf", "#875fd7", "#875fff",
    "#878700", "#87875f", "#878787", "#8787af", "#8787d7", "#8787ff", "#87af00",
    "#87af5f", "#87af87", "#87afaf", "#87afd7", "#87afff", "#87d700", "#87d75f",
    "#87d787", "#87d7af", "#87d7d7", "#87d7ff", "#87ff00", "#87ff5f", "#87ff87",
    "#87ffaf", "#87ffd7", "#87ffff", "#af0000", "#af005f", "#af0087", "#af00af",
    "#af00d7", "#af00ff", "#af5f00", "#af5f5f", "#af5f87", "#af5faf", "#af5fd7",
    "#af5fff", "#af8700", "#af875f", "#af8787", "#af87af", "#af87d7", "#af87ff",
    "#afaf00", "#afaf5f", "#afaf87", "#afafaf", "#afafd7", "#afafff", "#afd700",
    "#afd75f", "#afd787", "#afd7af", "#afd7d7", "#afd7ff", "#afff00", "#afff5f",
    "#afff87", "#afffaf", "#afffd7", "#afffff", "#d70000", "#d7005f", "#d70087",
    "#d700af", "#d700d7", "#d700ff", "#d75f00", "#d75f5f", "#d75f87", "#d75faf",
    "#d75fd7", "#d75fff", "#d78700", "#d7875f", "#d78787", "#d787af", "#d787d7",
    "#d787ff", "#d7af00", "#d7af5f", "#d7af87", "#d7afaf", "#d7afd7", "#d7afff",
    "#d7d700", "#d7d75f", "#d7d787", "#d7d7af", "#d7d7d7", "#d7d7ff", "#d7ff00",
    "#d7ff5f", "#d7ff87", "#d7ffaf", "#d7ffd7", "#d7ffff", "#ff0000", "#ff005f",
    "#ff0087", "#ff00af", "#ff00d7", "#ff00ff", "#ff5f00", "#ff5f5f", "#ff5f87",
    "#ff5faf", "#ff5fd7", "#ff5fff", "#ff8700", "#ff875f", "#ff8787", "#ff87af",
    "#ff87d7", "#ff87ff", "#ffaf00", "#ffaf5f", "#ffaf87", "#ffafaf", "#ffafd7",
    "#ffafff", "#ffd700", "#ffd75f", "#ffd787", "#ffd7af", "#ffd7d7", "#ffd7ff",
    "#ffff00", "#ffff5f", "#ffff87", "#ffffaf", "#ffffd7", "#ffffff", "#080808",
    "#121212", "#1c1c1c", "#262626", "#303030", "#3a3a3a", "#444444", "#4e4e4e",
    "#585858", "#626262", "#6c6c6c", "#767676", "#808080", "#8a8a8a", "#949494",
    "#9e9e9e", "#a8a8a8", "#b2b2b2", "#bcbcbc", "#c6c6c6", "#d0d0d0", "#dadada",
    "#e4e4e4", "#eeeeee",
];

const PaletteVga = {
    Black: "rgb(0, 0, 0)",
    Red: "rgb(170, 0, 0)",
    Green: "rgb(0, 170, 0)",
    Yellow: "rgb(170, 85, 0)",
    Blue: "rgb(0, 0, 170)",
    Magenta: "rgb(170, 0, 170)",
    Cyan: "rgb(0, 170, 170)",
    White: "rgb(170, 170, 170)",
    BrightBlack: "rgb(85, 85, 85)",
    BrightRed: "rgb(255, 85, 85)",
    BrightGreen: "rgb(85, 255, 85)",
    BrightYellow: "rgb(255, 255, 85)",
    BrightBlue: "rgb(85, 85, 255)",
    BrightMagenta: "rgb(255, 85, 255)",
    BrightCyan: "rgb(85, 255, 255)",
    BrightWhite: "rgb(255, 255, 255)",
}

const PaletteDracula = {
    Black: "#21222C",
    Red: "#FF5555",
    Green: "#50FA7B",
    Yellow: "#F1FA8C",
    Blue: "#BD93F9",
    Magenta: "#FF79C6",
    Cyan: "#8BE9FD",
    White: "#F8F8F2",
    BrightBlack: "#6272A4",
    BrightRed: "#FF6E6E",
    BrightGreen: "#69FF94",
    BrightYellow: "#FFFFA5",
    BrightBlue: "#D6ACFF",
    BrightMagenta: "#FF92DF",
    BrightCyan: "#A4FFFF",
    BrightWhite: "#FFFFFF",
}

/** Create CSS classes and edit elements. */
class Theme {
    static BG_CLASS_PREFIX = 'term-bg-';
    static FG_CLASS_PREFIX = 'term-fg-';
    static CUBE_CLASS_PREFIX = 'cube-';

    /** @returns {string} The default class for background. */
    static defaultBg() {
        return Theme.BG_CLASS_PREFIX + 'black';
    }

    /** @returns {string} The default class for foreground. */
    static defaultFg() {
        return Theme.FG_CLASS_PREFIX + 'white';
    }

    /** @returns {string} The default class for font theme. */
    static defaultFont() {
        return 'term-font';
    }

    /** @returns {ElementTheme} The default element theme. */
    static default() {
        return {
            bg: Theme.defaultBg(),
            fg: Theme.defaultFg(),
            font: Theme.defaultFont(),
            styles: undefined,
        }
    }

    /** @returns {null} Create RGB 216-color 6^3 color cube classes. */
    static initColorCube() {
        const ID = "cube-style";
        if (document.getElementById(ID)) {
            return;
        }

        let style = createElement(
            "style",
            document.getElementsByTagName("head")[0],
            ID,
        );

        for (let i = 0; i < COLOR_CUBE.length; i++) {
            style.innerHTML += Theme.createColorCSS(
                Theme.ansiCubeToCSSColor(i + 16), COLOR_CUBE[i]
            );
        }
    }

    /** Create a style tag for the classes used in the code.
     *
     * @param {Palette} palette - The palette dictionary fo values.
     * @param {string | null} font - The CSS for the first font class (`.font`).
     * @returns {null}
     */
    static updateTheme(
        palette = PaletteDracula,
        font = null
    ) {
        const ID = "theme-style";
        let style = document.getElementById(ID);

        // if not available, create it...
        if (!style) {
            style = createElement(
                "style",
                document.getElementsByTagName("head")[0],
                ID,
            );
        }

        style.innerHTML = (
            '.term-font { font-size: medium; '
            + 'font-family: ' + (!font ? "" : font + ", ")
            + 'monospace, "Iosevka", "SFMono-Regular", Menlo, Monaco, Consolas,'
            + ' "Liberation Mono", "Courier New", ui-monospace; } \n'
        );

        for (let cls in palette) {
            const color = palette[cls];
            cls = Theme.paletteToCSSColor(cls);

            style.innerHTML += Theme.createColorCSS(cls, color);
        }
    }

    /** Create background and foreground versions of a class in CSS.
     *
     * @param {string} cls - Name of the class without prefix or postfix.
     * @param {string} color - The color for the class.
     * @return {string} CSS code.
     */
    static createColorCSS(cls, color) {
        return (
            '.' + Theme.BG_CLASS_PREFIX + cls
            + ' { background-color: ' + color + '; }\n'
            + '.' + Theme.FG_CLASS_PREFIX + cls
            + ' { color: ' + color + '; }\n'
        );
    }

    /** Convert given key of the CSS color (BrightBlack -> bright-black).
     *
     * @param {string} k - Key of {@link Palette}.
     * @returns {string} If code is valid, returns string else null.
     * @throws {TypeError} If the key is invalid.
     */
    static paletteToCSSColor(k) {
        const isBright = k.startsWith('Bright');
        let index = isBright ? COLORS.indexOf(k.slice(6)) : COLORS.indexOf(k);
        if (index === -1) {
            throw TypeError(`Invalid palette color (${k})`);
        }

        if (isBright) {
            k = k.slice(0, 6) + '-' + k.slice(6);
        }

        return k.toLowerCase();
    }

    /** @returns {boolean} Whether the given code is a dark ANSI foreground. */
    static isAnsiDarkFg(c) {
        return (30 <= c && c <= 37);
    }

    /** @returns {boolean} Whether the given code is a dark ANSI foreground. */
    static isAnsiBrightFg(c) {
        return (90 <= c && c <= 97);
    }

    /** @returns {boolean} Whether the given code is an ANSI foreground. */
    static isAnsiFg(c) {
        return Theme.isAnsiDarkFg(c) || Theme.isAnsiBrightFg(c);
    }

    /** @returns {boolean} Whether the given code is a dark ANSI background. */
    static isAnsiDarkBg(c) {
        return (40 <= c && c <= 47);
    }

    /** @returns {boolean} Whether the given code is a dark ANSI background. */
    static isAnsiBrightBg(c) {
        return (100 <= c && c <= 107);
    }

    /** @returns {boolean} Whether the given code is an ANSI background. */
    static isAnsiBg(c) {
        return Theme.isAnsiDarkBg(c) || Theme.isAnsiBrightBg(c);
    }

    /** @returns {boolean} Whether the given code is an ANSI dark. */
    static isAnsiDark(c) {
        return Theme.isAnsiDarkBg(c) || Theme.isAnsiDarkFg(c);
    }

    /** @returns {boolean} Whether the given code is an ANSI bright. */
    static isAnsiBright(c) {
        return Theme.isAnsiBrightBg(c) || Theme.isAnsiBrightFg(c);
    }

    /** Convert given ANSI key to CSS color name (100 -> bright-black).
     *
     * @param {number} c - ANSI code (30-37, 40-47, 90-97 or 100-107).
     * @returns {string} If code is valid, returns string else null.
     * @throws {TypeError} If the key is invalid.
     */
    static ansiToCSSColor(c) {
        if (Theme.isAnsiDarkFg(c)) {
            return Theme.paletteToCSSColor(COLORS[c - 30]);
        } else if (Theme.isAnsiDarkBg(c)) {
            return Theme.paletteToCSSColor(COLORS[c - 40]);
        } else if (Theme.isAnsiBrightFg(c)) {
            return Theme.paletteToCSSColor('Bright' + COLORS[c - 90]);
        } else if (Theme.isAnsiBrightBg(c)) {
            return Theme.paletteToCSSColor('Bright' + COLORS[c - 100]);
        } else {
            throw TypeError(`Invalid ANSI color (${c})`)
        }
    }

    /** Convert given ANSI Cube Color to CSS color name (100 -> cube-100).
     *
     * @param {number} c - ANSI code (16-231).
     * @returns {string} If code is valid, returns string else null.
     * @throws {TypeError} If the key is invalid.
     */
    static ansiCubeToCSSColor(c) {
        if (16 <= c && c <= 255) {
            return Theme.CUBE_CLASS_PREFIX + `${c}`;
        }
        throw TypeError(`Invalid ANSI cube color (${c})`)
    }

    /** Convert given ANSI key to CSS class (100 -> .term-bg-bright-black).
     *
     * @param {number} c - ANSI code (30-37, 40-47, 90-97 or 100-107).
     * @returns {string} If code is valid, returns string else null.
     * @throws {TypeError} If the key is invalid.
     */
    static ansiToCSSClass(c) {
        const prefix = Theme.isAnsiBg(c) ?
            Theme.BG_CLASS_PREFIX : Theme.FG_CLASS_PREFIX;
        const color = Theme.ansiToCSSColor(c); // throws if invalid
        return prefix + color;
    }

    /** Add the classes defined in theme to the element.
     *
     * @param {HTMLElement} el - The element subject to the stylization.
     * @param {ElementTheme} theme=null - The CSS class of palette.
     * @returns {null}
     */
    static applyTheme(el, theme = null) {
        const def = Theme.default();
        theme = theme ? theme : def;

        // the classes are known so just swap them.
        if (el.terminalTheme) {
            for (const k in el.terminalTheme) {
                if (theme[k] === null) {
                    el.classList.remove(el.terminalTheme[k]);
                } else if (theme[k] !== undefined) {
                    el.classList.replace(el.terminalTheme[k], theme[k]);
                }
            }
        } else {
            for (const k in theme) {
                if (theme[k] !== undefined) {
                    el.classList.add(theme[k]);
                }
            }
        }

        el.terminalTheme = theme;
    }

    /** Update values from the new theme if not undefined.
     *
     * @param {ElementTheme} old
     * @param {ElementTheme} other
     * @returns {ElementTheme} Where the `old` is overriden where the new is
     *   defined.
     */
    static mergeThemes(old, other) {
        for (const k in other) {
            const v = other[k];
            if (v !== undefined) {
                old[k] = v;
            }
        }

        return old;
    }

    /** Apply theme to a series of elements.
     *
     * @param qualifiedName - Name of the tag to search for.
     * @returns {null}
     */
    static applyByTagName(qualifiedName) {
        for (let el of document.getElementsByTagName(qualifiedName)) {
            this.applyTheme(el);
        }
    }
}

/** A valid escape sequence.
 *
 * The implementation here is based on the descriptions of
 * {@link https://en.wikipedia.org/w/index.php?title=ANSI_escape_code&oldid=1201088508#3-bit_and_4-bit|ANSI escape code on Wikipedia}.
 *
 * @property {string[]} codes - The list of codes before `m`.
 * @property {string[]} classesRev - The list of assigned CSS classes in reverse
 *   order of importance.
 * @property {string} style - The assigned CSS styles.
 * @property {string} seq - The remaining string without an initial escape.
 */
class EscapeCSS {
    /** Create the escape sequence if supported or throw.
     *
     * @param {string} seq - A valid escape sequnece. For supported codes see
     *   the function.
     * @throws {TypeError} If the escape sequence is not supported
     *   (not necessarily invalid).
     */
    constructor(seq) {
        // A custom parser is written for maximum control and performance
        // instead of regex or stuff.

        const err = this.constructor.__err;

        // ^[[\dm
        // ^ ^^ ^---- minimum length is 4
        if (
            typeof seq !== 'string'
            || seq.length < 4
            || seq[0] !== ''
            || seq[1] !== '['
        ) {
            err();
        }

        this.codes = [];
        // reverse for keeping order (latest is more important if duplicate)
        /** @type {ElementTheme} */
        this.theme = {
            bg: undefined,
            fg: undefined,
            font: undefined,
            style: undefined,
        };

        seq = seq.slice(2); // remove ESC[
        // The length check < 4 makes sure this is never empty and not 'm'

        while (seq[0] !== 'm') {
            let eod = this.constructor.endOfDigits(seq);
            // no valid digit sequence at start.
            if (eod === 0) {
                err();
            }

            const last = seq.slice(0, eod);

            // check if code is supported or premature end
            if (eod === seq.length) {
                err();
            }

            this.codes.push(Number(last));
            // non empty for the last check
            if (seq[eod] === ';') {
                eod += 1;
            }
            seq = seq.slice(eod);
        }
        seq = seq.slice(1);
        this.seq = seq; // remove m and the seq is done.

        // if here, this.codes is populated with codes and seq is 'm' (end)
        // The only thing is left to validate if the code segments are valid...
        // for example 31;299 is invalid but this far only 31 is validate.

        // TODO clean, kinda running low on time.
        let lastSeg = this.codes.length - 1;
        for (let seg = 0; seg <= lastSeg; seg++) {
            const cmd = this.codes[seg];

            if (cmd === 0) {
                this.theme = Theme.default();
                continue;
            }

            if (cmd === 39) {
                this.theme.fg = Theme.defaultFg();
                continue;
            }

            if (cmd === 49) {
                this.theme.bg = Theme.defaultBg();
                continue;
            }

            const isBg = cmd === 48;
            const key = isBg ? 'bg' : 'fg';
            if (cmd === 38 || isBg) {
                let arg = this.codes[++seg];

                if (arg === 5) {
                    let n = this.codes[++seg];
                    if (0 <= n && n <= 7) {
                        this.theme[key] = Theme.ansiToCSSClass(cmd - 8 + n);
                    } else if (8 <= n && n <= 15) {
                        this.theme[key] = Theme.ansiToCSSClass(cmd + 52 + n);
                    } else if (16 <= n && n <= 255) {
                        const prefix = isBg ?
                            Theme.BG_CLASS_PREFIX : Theme.FG_CLASS_PREFIX;
                        this.theme[key] = prefix + Theme.ansiCubeToCSSColor(n);
                    } else {
                        err();
                    }
                } else if (arg === 2) {
                    let r = this.codes[++seg];
                    let g = this.codes[++seg];
                    let b = this.codes[++seg];
                    if (!r || !g || !b) {
                        err();
                    }

                    const prefix = isBg ? 'background-' : '';
                    this.style += `${prefix}color: rgb(${r}, ${g}, ${b});`;
                } else {
                    err();
                }
                continue;
            }

            // see if it is a color before trying anything else
            // supports 30-37, 40-47, 90-97 and 100-107
            try {
                this.theme[key] = Theme.ansiToCSSClass(cmd);
                continue;
            } catch (TypeError) {}

            // everything must continue before hitting this.
            err();
        }

    }

    /** Raise error (makes it tracable). */
    static __err() {
        throw new TypeError("Unsupported escape sequence");
    }

    /** A simple Rustic digit match.
     *
     * @param {string} s - The string with a potential starting substring of
     *   numbers.
     * @returns {number} The end of valid strings (0 implies that there is no
     *   number at start).
     */
    static endOfDigits(s) {
        for (let i = 0; i < s.length; i++) {
            const code = s.charCodeAt(i);
            if (isNaN(code) || code < 48 || code > 57) {
                return i;
            }
        }
        return s.length;
    }
}

/** The terminal component.
 *
 * @property {number} characterDelay - The delay before each character from a
 *   stream is printed to the buffer in milliseconds. Set to 0 alongside
 *   `lineDelay` to disable animations.
 * @property {number} lineDelay - The delay between each entry of a list given
 *   to stream. This does not necessarily care about '\n'.
 * @property {HTMLElement} el - The main tag holding all the others.
 * @property {HTMLElement} buffer - The immutable data area above the terminal.
 * @property {HTMLElement} input - User input section which is editable before
 *   submitting.
 * @property {Array.<string | Array.<string, boolean>>} __toPrint - The queue
 *   for data input. Data added here will be printed. If the second item is
 *   true, the given script will skip animation. Adding elements to this is not
 *   guaranteed to always initiate animation. Use methods.
 * @property {boolean} __animating - If true, toPrint queue is being processed.
 *   This prevents multiple animation processing signals and processes.
 * @property {callback[]} addTextHooks - The functions with one argument of type
 *   {@link AddTextEvent} to call upon change in the buffer text.
 */
class Terminal {
    characterDelay = 1;
    lineDelay = 100;
    __toPrint = [];
    __animating = false;
    addTextHooks = [];
    exit = 0;

    /** Create the terminal.
     *
     * After construction, call prompt to show the prompt and focus on it.
     *
     * @param {HTMLElement | null} host - Where to place the terminal upon
     *   creation. If missed, one can do this by calling `el` on the current.
     * @param {string} id - ID of the terminal container.
     * @param {boolean} noFocus - Do not automatically focus on the input.
     */
    constructor(host = null, id = null) {
        this.el = createElement("terminal", host, id);

        this.buffer = createElement("buffer", this.el);
        this.addListenerLMBFocus(this.buffer);

        this.input = createElement("input", this.el);
        this.input.setAttribute("tabindex", "0");
        this.input.style.padding = "0";
        this.input.style.margin = "0";
        this.input.style.border = "0";
        this.input.style.width = "1px"; // initial
        this.input.addEventListener('input', (ev) => {
            ev.target.style.width = `${ev.target.value.length}ch`;
        });
        this.input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                // if (ev.shiftKey)
                // TODO add support for shift variant once not using input
                // ev.target.value += '\n'; else
                this.submit();
            }
        })

        this.applyTheme();
    }

    /** Event function to be bind to focus on the input.
     *
     * @param {HTMLElement} el
     */
    addListenerLMBFocus(el) {
        // TODO be drag compatible
        el.addEventListener('mousedown', (ev) => {
            if (ev.button === 0) {
                ev.preventDefault();
                this.input.focus();
            }
        });
    }

    /** Send the data to the shell. */
    submit() {
        const cmd = this.input.value;
        this.input.value = '';
        this.input.style.width = "1px"; // initial
        this.__addTextForce(cmd + '\n');
        // do not animate inputs as it is something "local" and makes the user
        // feel unresponsive.
        // Also, this is to keep the same feeling as the real terminals where
        // STDIN does not register the keys and emulator simply just types the
        // inputs while a process is active.
        this.__submitManual(cmd);
        this.prompt();
    }

    /** Send the data to the shell.
     *
     * @param {string} cmd - The command to be submitted manually.
     */
    __submitManual(cmd) {
        const args = cmd.split(' ').filter((v) => v.trim() !== '');

        if (args.length !== 0) {
            if ($shell.commands[args[0]]) {
                try {
                    this.exit = $shell.commands[args[0]].callback(
                        (s) => this.addText(s),
                        ...args.slice(1)
                    );
                } catch (e) {
                    console.error(e);
                    this.__addTextForce('internal error: ' + String(e) + '\n');
                    this.exit = 1;
                }
            } else if ($shell.aliases[args[0]]) {
                return this.__submitManual(
                    $shell.aliases[args[0]].destination
                    + ' ' + args.slice(1).join(' ')
                );
            } else {
                this.__addTextForce(ERRORS[127] + '\n');
                this.exit = 127;
            }
        }
    }

    /** Show and focus on the prompt. */
    prompt() {
        this.addText(
            (this.exit === 0 ? '[32m' : '[31m')
            + $prompt
            + '[0m'
        );
        this.input.focus();
    }

    /** Apply theme on every element of this class. */
    applyTheme() {
        Theme.applyTheme(this.el);
        Theme.applyTheme(this.buffer);
        Theme.applyTheme(this.input);
    }

    /** Manage time in toPrint list. */
    __animateToPrint() {
        // stop animation...
        if (this.__toPrint.length === 0) {
            this.__animating = false;
            return;
        }

        this.__animating = true;

        // there is a new line to print
        if (this.__toPrint[0]) {
            // there is a new character to print
            const next = this.__toPrint[0];

            if (next) {
                // NOTE that for the shift after this if, assuming a toPrint
                // line is shifted (and not set to undefined instead) will skip
                // the `lineDelay`. So in order for the animation to work
                // correctly, one must set the element to undefined instead of
                // removing it.

                // if skip animation is given do not wait for the next char.
                if (Array.isArray(next) && next[1]) {
                    this.__addTextForce(next[0]);
                    this.__toPrint[0] = undefined;
                    this.__animateToPrint();
                } else {
                    // If any escape sequence, capture it all else just one c.
                    let end = 1;
                    if (next[0] === '') {
                        const index = next.indexOf('m');
                        if (index !== -1) {
                            end = index + 1;
                        }
                    }
                    this.__addTextForce(next.slice(0, end));
                    const rest = this.__toPrint[0].slice(end);
                    this.__toPrint[0] = rest === '' ? undefined : rest;
                    setTimeout(() => this.__animateToPrint(), this.characterDelay);
                }

                return;
            }
        }

        // no character so wait for the new line.
        this.__toPrint.shift();
        // if here, the line is over, wait for the next line...
        setTimeout(() => this.__animateToPrint(), this.lineDelay);
    }

    /** Add text without animation (still respecting others to play).
     *
     */
    addText(text) {
        this.stream([[text, true]]);
    }

    /** Add text to the buffer (instantly, regardless of animation).
     *
     * @param {string} text
     */
    __addTextForce(text) {
        let textCopy = text;
        for (let i = 0; i < text.length; i++) {
            const lastChild = this.buffer.children[this.buffer.children.length - 1];
            const hasLastChild = lastChild && lastChild.tagName === 'SPAN';
            const lastTheme = hasLastChild && lastChild.terminalTheme ?
                lastChild.terminalTheme : this.buffer.terminalTheme;

            // especial character handling (set c to undefined if skipable).
            let next = text[i];
            if (next === '\n') {
                next = '<br/>';
            } else if (next === '\t') {
                next = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
            } else if (next === ' ') {
                next = '&nbsp;'
            } else if (next === '') {
                // first analyse and if okay, add the span, else print as is.
                let span = createElement("span", this.buffer);

                try {
                    // TODO optimize
                    const escape = new EscapeCSS(text.slice(i));

                    const merge = Theme.mergeThemes(lastTheme, escape.theme);
                    Theme.applyTheme(span, merge);

                    text = escape.seq;
                    i = -1;
                    continue;
                } catch (e) {}
            }

            // add the next to the last span if possible (to keep the colors).
            if (hasLastChild) {
                lastChild.innerHTML += next;
            } else {
                this.buffer.innerHTML += next;
            }
        }

        for (const i of this.addTextHooks) {
            /** The event sent to every function in addTextHooks.
             *
             * @typedef {Obeject} AddTextEvent
             * @property {string} textChange - The text just changed.
             */
            /** @type AddTextEvent */
            const ev = { textChange: textCopy };
            i(ev);
        }
    }

    /** Predicate if animations are disabled.
     *
     * @returns {boolean} If true, animations are disabled.
     */
    animationDisabled() {
        return this.lineDelay === 0 && this.characterDelay === 0;
    }

    /** Add text with animation (blocking not to change order of text).
     *
     * @param {string[]} lines
     */
    stream(lines) {
        // user has disabled the animations
        if (this.animationDisabled()) {
            for (let i of lines) {
                // skip animation commands must be removed...
                if (Array.isArray(i)) {
                    i = i[0];
                }
                this.__addTextForce(i);
            }

            return;
        }

        this.__toPrint.push(...lines);
        // Removing this line will speed up the print process in respect to
        // amount of lines queues and calls on this animation function.
        // TODO add a way to kill the animations instantly.
        if (!this.__animating) {
            this.__animateToPrint();
        }
    }
}

document.addEventListener("DOMContentLoaded", (_loadEvent) => {
    /** A shortcut pointer to the body tag. */
    Theme.initColorCube();
    Theme.updateTheme();

    const body = document.getElementsByTagName("body")[0];
    body.style.whiteSpace = 'no-wrap';
    body.style.width = '80ch';
    Theme.applyTheme(body);

    body.innerHTML = '';
    const terminal = new Terminal(body);

    // In this full screen instance
    terminal.el.style.paddingBottom = '2em';
    terminal.addTextHooks.push((_) => {
        // TODO skip scroll if not at the bottom.
        window.scrollTo({
            top: document.body.scrollHeight + 100,
            behavior: "smooth",
        });
    });
    terminal.addListenerLMBFocus(body);
    terminal.addListenerLMBFocus(document);

    // Terminal is ready
    terminal.stream(LOADING);
    terminal.addText(BANNER);
    terminal.addText('\n');
    terminal.stream(INTRO);
    terminal.prompt();
    terminal.stream('help\n');
    terminal.__submitManual('help');
    terminal.prompt();
});
