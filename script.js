let cb;
let msgs = {};
let ignored = ['169'];

document.addEventListener('DOMContentLoaded', (event) => {
    // Initialize MIDI
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
        console.error('Web MIDI API is not supported in this browser.');
    }
});

function onMIDISuccess(midiAccess) {
    // Get MIDI input devices
    const inputs = midiAccess.inputs.values();
    const selectElement = document.getElementById('midiInput');

    // Add MIDI input devices to the dropdown
    for (const input of inputs) {
        const option = document.createElement('option');
        option.value = input.id;
        option.text = input.name;
        selectElement.add(option);
    }

    // Add event listener to the dropdown
    selectElement.addEventListener('change', (event) => {
        const selectedInputId = event.target.value;
        const selectedInput = midiAccess.inputs.get(selectedInputId);

        if (selectedInput) {
            // Listen for MIDI messages
            selectedInput.onmidimessage = (message) => {
                msg = message.data
                if (ignored.includes('' + msg[0])) return;
                if (cb) {
                    cb(msg);
                    cb = undefined;
                } else {
                    msg0 = msgs['' + msg[0]];
                    console.log(msgs);
                    if (msg0) {
                        msg1 = msg0['' + msg[1]];
                        if (msg1) {
                            element = document.querySelector(msg1.id);
                            if (msg1.axis) {
                                // if axis set value
                                element.style.setProperty('--v', msg[2]);
                            } else if (msg1.velo) {
                                element.style.setProperty('--v', msg[2]);
                            } else if (!msg1.down) {
                                // if button is on toggle off
                                element.style.setProperty('--v', 0);
                            } else {
                                // if button is off toggle on
                                element.style.setProperty('--v', 127);
                            }
                        } else {
                            console.log(msg[0], msg[1]);
                        }
                    }
                }
            };
        }
    });
}

function onMIDIFailure(error) {
    console.error('MIDI Access Failed:', error);
}

async function learnAxs(joy, index) {
    if (document.getElementById('midiInput').value == 'none') return;
    const id = `#a${joy}-${index}`;
    const element = document.querySelector(id);
    if (element.classList.contains('disabled')) toggle(joy, true, index);
    const msg = await new Promise((res) => cb = res);
    if (!msgs['' + msg[0]]) msgs['' + msg[0]] = {}
    msgs['' + msg[0]]['' + msg[1]] = {
        axis: true,
        joy,
        index,
        id
    }
}

async function learnBtn(joy, index) {
    if (document.getElementById('midiInput').value == 'none') return;
    const id = `#b${joy}-${index}`;
    const element = document.querySelector(id);
    if (element.classList.contains('disabled')) toggle(joy, false, index);
    const down = await new Promise((res) => cb = res);
    if (!msgs['' + down[0]]) msgs['' + down[0]] = {}
    const up = await new Promise((res) => cb = res);
    if (!msgs['' + up[0]]) msgs['' + up[0]] = {}
    if (down[0] == up[0]) {
        msgs['' + down[0]]['' + down[1]] = {
            axis: false,
            velo: true,
            joy,
            index,
            id
        }
        return;
    }
    msgs['' + down[0]]['' + down[1]] = {
        axis: false,
        velo: false,
        down: true,
        joy,
        index,
        id
    }
    msgs['' + up[0]]['' + up[1]] = {
        axis: false,
        velo: false,
        down: false,
        joy,
        index,
        id
    }
}

function toggle(joy, axis, index) {
    const id = `#${axis ? 'a' : 'b'}${joy}-${index}`;
    console.log('' + index);
    const element = document.querySelector(id);
    if (element.classList.contains('disabled')) element.classList.remove('disabled');
    else {
        element.classList.add('disabled');
        deleteById(msgs, id)
    }
}

function deleteById(obj, targetValue) {
    for (const key in obj) {
        for (const subkey in obj[key]) {
            if (obj[key][subkey].id === targetValue) {
                delete obj[key][subkey];
            }
        }
    }
}

function deleteByJoy(obj, joys) {
    for (const key in obj) {
        for (const subkey in obj[key]) {
            if (obj[key][subkey].joy > joys) {
                delete obj[key][subkey];
            }
        }
    }
}

function gen() {
    const head = `import pygame
import pygame.midi
import ctypes
import os
from time import sleep

axes = [0, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35]

exit = [False]
vjoy = [None]

joys = ${document.querySelector('#joys').value};

def read():
    pygame.init()
    pygame.midi.init()

    # Get the total number of MIDI devices
    num_devices = pygame.midi.get_count()
    if num_devices == 0:
        priint(\"No MIDI devices found.\")
        return

    # Find the plugged-in MIDI controller
    controller_id = pygame.midi.get_default_input_id()

    # Open the MIDI input device
    midi_input = pygame.midi.Input(controller_id)

    priint(\"Logging MIDI messages. Press Ctrl+C to stop.\")

    try:
        dll = os.path.join('C:\\Program Files', 'vJoy', 'x64', 'vJoyInterface.dll')
        vjoy[0] = ctypes.WinDLL(dll)
        for i in range(joys):
            vjoy[0].AcquireVJD(i+1)
    except:
        priint(\"Error initilizing vJoy\")
    try:
        # Continuously read and log MIDI messages
        while True:
            if (exit[0]):
                break
            if midi_input.poll():
                midi_events = midi_input.read(10)  # Read up to 10 MIDI events at once
                for midi_event in midi_events:
                    parse(midi_event[0])


    except KeyboardInterrupt:
        print(\"MIDI logging stopped.\")

    finally:
        # Clean up
        for i in range(joys):
            vjoy[0].RelinquishVJD(i+1)
        midi_input.close()
        pygame.midi.quit()
        pygame.quit()
`
    const tail = `
def btn(joy, i, v):
    vjoy[0].SetBtn(v, joy, i)

def axs(joy, i, v):
    vjoy[0].SetAxis(v * 258, joy, axes[i])

def priint(msg):
    print(\"\\u000D\" + str(msg))

if __name__ == '__main__':
    read()
`
    deleteByJoy(msgs, document.querySelector('#joys').value);
    const parseFunction = genParse();
    document.querySelector('#txt').innerText = head + parseFunction + tail;
}

function genParse() {
    func = `def parse(e):
`
//     if (e[0] == 128 and e[1] == 0):
//         exit[0] = True
// `
    for (const key in msgs) {
        if (Object.keys(msgs[key]).length > 0) {
            func += `    if (e[0] == ${parseInt(key)}):
`
            for (const subkey in msgs[key]) {
                func += `        if (e[1] == ${parseInt(subkey)}):
            ${genCall(msgs[key][subkey])}
`
            }
        }
    }
    return func;
}

function genCall(event) {
    call = '';
    if (event.axis) call += 'axs(';
    else call += 'btn(';
    call += event.joy;
    call += ', ';
    call += event.index;
    call += ', ';
    if (event.axis) call += 'e[2]';
    else if (event.velo) call += '(e[2] > 0)';
    else if (event.down) call += 'True';
    else call += 'False';
    call += `)
`;
    return call;
}

function updateAt() {
    ignored = document.querySelector('#at').value.split(',');
}

function updateJoys() {
    input = document.querySelector('#joys');
    if (input.value < 1) input.value = 1;
    let enabled = new Array(6).fill(false);
    enabled.fill(true, 0, input.value);
    setJoysticks(enabled);
    if (input.value > 6) input.value = 6;
}

function setJoysticks(enabled) {
    enable(document.querySelector('#j1'), enabled[0]);
    enable(document.querySelector('#j2'), enabled[1]);
    enable(document.querySelector('#j3'), enabled[2]);
    enable(document.querySelector('#j4'), enabled[3]);
    enable(document.querySelector('#j5'), enabled[4]);
    enable(document.querySelector('#j6'), enabled[5]);
}

function enable(element, enable) {
    if (enable && element.classList.contains('disabled')) element.classList.remove('disabled');
    if (!enable && !element.classList.contains('disabled')) element.classList.add('disabled');
}
