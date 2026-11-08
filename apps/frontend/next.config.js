const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@u-abac/types'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;

