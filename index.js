import { init, WASI } from 'https://esm.sh/@wasmer/wasi@1.2.2'
import Clang from './clang.js'
import Lld from './lld.js'

await init()

export const compileAndRun = async (mainC) => {
    const clang = await Clang()
    clang.FS.writeFile('main.cpp', mainC)
    await clang.callMain(['-fno-exceptions', '-std=c++23', '-c', 'main.cpp', '-v'])

    const mainO = clang.FS.readFile('main.o')
	console.log("built object file")
	
    const lld = await Lld()
    lld.FS.writeFile('main.o', mainO)
    await lld.callMain([
        '-flavor',
        'wasm',
        '-L/lib/wasm32-wasi',
        '-lc',
        '-lc++',
        '-lc++abi',
        '/lib/clang/17.0.6/lib/wasi/libclang_rt.builtins-wasm32.a',
        '/lib/wasm32-wasi/crt1.o',
        'main.o',
        '-o',
        'main.wasm',
    ])
    const mainWasm = lld.FS.readFile('main.wasm')
    console.log("built wasm file")

    const wasi = new WASI({})
    const module = await WebAssembly.compile(mainWasm)
    const instance = await WebAssembly.instantiate(module, {
        ...wasi.getImports(module)
    })

    console.log("running wasm file")
    wasi.start(instance)
    const stdout = await wasi.getStdoutString()
    return stdout
}
