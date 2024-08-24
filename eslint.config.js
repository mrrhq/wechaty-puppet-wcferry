// @ts-check
import mrrhq from '@antfu/eslint-config'

export default mrrhq(
  {
    type: 'lib',
    rules: {
      'ts/explicit-function-return-type': 'off',
      'no-case-declarations': 'off',
    },
  },
)
