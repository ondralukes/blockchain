{
  'variables': {
    'node_shared_openssl%': 'true'
  },
  'targets': [
    {
      'target_name': 'engine',
      'sources': [
        'engine_bridge.c',
        'engine.c',
        'queue.c',
        'object_utils.c',
        'transaction.c',
        'block.c',
        'storage.c',
        'utils.c'
        ],
      'conditions': [
        ['node_shared_openssl=="false"', {
          'include_dirs': [
            '<(node_root_dir)/deps/openssl/openssl/include'
          ],
          "conditions" : [
            ["target_arch=='ia32'", {
              "include_dirs": [ "<(node_root_dir)/deps/openssl/config/piii" ]
            }],
            ["target_arch=='x64'", {
              "include_dirs": [ "<(node_root_dir)/deps/openssl/config/k8" ]
            }],
            ["target_arch=='arm'", {
              "include_dirs": [ "<(node_root_dir)/deps/openssl/config/arm" ]
            }]
          ]
        }]
      ]
    }
  ]
}
