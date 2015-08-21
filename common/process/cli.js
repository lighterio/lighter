/**
 * Construct a command line interface with options, and potentially multiple commands.
 *
 * @origin https://github.com/lighterio/lighter-common/common/process/cli.js
 * @version 0.0.1
 * @import string/colors
 * @import fs/shorten-path
 */

var fs = require('fs')
var colors = require('../string/colors')
var shortenPath = require('../fs/shorten-path')
var argv = process.argv.slice(2)

/**
 * Given a configuration, invoke a command line interface.
 */
var cli = module.exports = function cli (config) {

  // Set defaults for config values where necessary.
  config = config || {}
  var main = process.mainModule.filename
  main.replace(/^(.*[\/\\])([^\.\/\\]+)\.[a-z]+$/g, function (match, path, name) {
    config.name = config.name || name
    config.dir = config.options ? undefined : path + 'commands'
  })
  config.aliases = config.aliases || {}
  config.aliases.h = config.aliases.h || 'help'

  // A multi-command CLI uses a commands directory.
  var command
  var dir = config.dir
  if (dir) {
    var command = argv.shift()
    // If there's no command, show usage info.
    if (!command) {
      config.help = true

    // If the command is help, show usage info.
    } else if (command === 'help') {
      config.help = true
      command = argv.shift()
    }
    // If there's a command, get its options.
    if (command) {
      config.command = command
      command = cli.require(dir, command)
      if (command) {
        config.options = command.options
      }
    }
    // If we need to show help, show it.
    if (config.help) {
      cli.help(config)

    // Otherwise try to run a command.
    } else {
      var options = cli.options(command)
      if (typeof command === 'function') {
        command(options)
      } else if (typeof command.run === 'function') {
        command.run(options)
      }
    }
  }

  // A single-command CLI just returns an options object.
  else {
    return cli.options(config)
  }
}

/**
 * Log a message and exit the process.
 */
cli.exit = function (message) {
  console.log('\n' + message + '\n')
  process.exit()
}

/**
 * Log an error message and exit the process.
 */
cli.error = function (message) {
  cli.exit('Error: '.red + message.replace(/(".*?")/g, '$1'.yellow))
}

/**
 * Load a module as a command configuration.
 */
cli.require = function (dir, command) {
  try {
    config = require(dir + '/' + command)
  }
  catch (e) {
    return cli.error('Could not find a "' + command + '" command in "' + shortenPath(dir) + '".')
  }
  return config
}

/**
 * Show usage information for one or more commands.
 */
cli.help = function (config) {
  var name = config.name
  var dir = config.dir
  var command = config.command
  var options = config.options
  var extras = config.extras
  var text = 'Usage:\n  ' + name.green

  // If a commands directory is specified, read it and show commands.
  if (dir) {
    text += ' <command>'.magenta + ' [options]'.cyan
    var files
    try {
      files = fs.readdirSync(dir)
    }
    catch (e) {
      return cli.error('Could not read commands from "' + shortenPath(dir) + '".')
    }
    files.forEach(function (file) {
      command = file.replace(/\..*$/, '')
      text += ''
    })
  }

  // For a single command, show options.
  else {
    if (options) {
      text += ' [options]'.cyan
    }
    if (config.extras) {
      text += (' [' + config.extras + '...]').yellow
    }
    if (options) {
      text += '\n\nOptions: '
      options.forEach(function (option) {
        if (!/HIDDEN/.test(option)) {
          text += '\n  ' + option
            .replace(/\s*(\(\w+\))?\s*(\[.+?\])?$/, function (match, a, b) {
              return b ? '. ' + ('(default: ' + b.substr(1, b.length - 2) + ')').gray : '.'
            })
            .replace(/(<[a-z]+>)/g, '$1'.yellow)
            .replace(/^(.*  )/, '$1'.cyan)
        }
      })
    }
  }

  cli.exit(text)
}

/**
 * Parse an array of options, and create a map using argv inputs.
 */
cli.options = function (config) {
  var options = config.options || []
  var extras = config.extras || 'extras'
  var index
  var map = {}
  var args = {}

  // Set up the map of options according to the config.
  options.forEach(function (option, index) {
    option = option.split(/  +/)
    var keys = option[0].split(/,? /)
    var type = 'String'
    var count = 0
    var name = ''
    keys.forEach(function (key) {
      if (key[0] === '<') {
        count++
      } else {
        if (key.length > name.length) {
          name = key
        }
      }
    })
    var property = name.replace(/^-+/, '')
    property = property.replace(/-[a-z]/g, function (match) {
      return match[1].toUpperCase()
    })
    var description = option[1]
      .replace(/\s*\[(.+?)\]$/, function (match, value) {
        args[property] = value
        return ''
      })
      .replace(/\s*\((\w+)\)$/, function (match, value) {
        type = value
        return ''
      })
    option = [property, type, count, description]
    keys.forEach(function (key) {
      if (key[0] !== '<') {
        map[key] = option
      }
    })
  })

  // Grab option values from process.argv arguments.
  args[extras] = []
  for (index = 0; index < argv.length; index++) {
    argv[index].replace(/^\s*(-*)(.*)\s*$/g, function (match, dash, rest) {
      if (dash === '--') {
        gotOption(match)
      } else if (dash === '-') {
        rest.split('').forEach(function (letter) {
          gotOption('-' + letter)
        })
      } else {
        args[extras].push(match)
      }
    })
  }

  // Handle the event of an option being seen.
  function gotOption (option) {
    if (map[option]) {
      option = map[option]
      var name = option[0]
      // Assume a boolean, and set to true because the argument is present.
      var value = true
      // If it takes arguments, override with a value.
      var count = option[2]
      while (count--) {
        value = argv[++index]
        if (argv.length === index) {
          return cli.error('The "' + name + '" option requires an argument.')
        }
      }
      // If it needs type conversion, do it.
      var type = option[1]
      if (type === 'Array') {
        value = value.split(',')
      } else if (type === 'RegExp') {
        try {
          value = new RegExp(value)
        }
        catch (e) {
          return cli.error('The "' + name + '" option received an invalid expression: "' + value + '".')
        }
      } else if (type === 'Number') {
        var number = value * 1
        if (isNaN(number)) {
          return cli.error('The "' + name + '" option received a non-numerical argument: "' + value + '".')
        }
      }
      args[name] = value
    } else {
      return cli.error('Unknown option: "' + option + '".')
    }
  }

  // Show the version if necessary.
  if (args.version && config.version && /^Show/.test(map['--version'][3])) {
    return cli.exit(config.version)
  }

  // Show usage info if necessary.
  if (args.help) {
    cli.help(config)
  }

  return args
}
