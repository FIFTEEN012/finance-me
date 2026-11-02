import { describe, expect, it } from "vitest";

import { assertSafeTestDatabaseUrl } from "./pgTestDb";

const CREDS = "finance_local:finance_local_dev_only";

describe("assertSafeTestDatabaseUrl", () => {
  it.each([
    `postgresql://${CREDS}@127.0.0.1:55433/finance_test`,
    `postgres://${CREDS}@localhost:5432/finance_test`,
    `postgresql://${CREDS}@LOCALHOST/finance_test`,
  ])("accepts %s", (url) => {
    expect(() => assertSafeTestDatabaseUrl(url)).not.toThrow();
  });

  it.each([
    [`postgresql://${CREDS}@127.0.0.1:55433/prod`, /must end with "_test"/],
    [`postgresql://${CREDS}@127.0.0.1:55433/finance_TEST`, /must end with "_test"/],
    [`postgresql://${CREDS}@127.0.0.1:55433/x_test?host=prod.example.com`, /query parameters/],
    [`postgresql://${CREDS}@127.0.0.1:55433/x_test?hostaddr=10.0.0.5`, /query parameters/],
    [`postgresql://${CREDS}@127.0.0.1:55433/x_test?sslmode=disable`, /query parameters/],
    [`postgresql://${CREDS}@db.example.neon.tech/finance_test`, /host must be loopback/],
    [`postgresql://${CREDS}@10.0.0.5:5432/finance_test`, /host must be loopback/],
    [`postgresql://${CREDS}@127.0.0.1.evil.example/finance_test`, /host must be loopback/],
    [`postgresql://${CREDS}@127.0.0.1,prod.example.com/finance_test`, /host must be loopback/],
    ["postgresql:///finance_test", /host must be loopback/],
    // postgres.js cannot connect to an IPv6 literal (it splits the host on ":").
    [`postgresql://${CREDS}@[::1]:55433/finance_test`, /host must be loopback/],
    // URL takes the host after the LAST "@", postgres.js after the FIRST.
    ["postgresql://u:p@db.evil.example,x@127.0.0.1:55433/finance_test", /userinfo must not contain/],
    ["postgresql://u:p@db.evil.example@127.0.0.1:55433/finance_test", /userinfo must not contain/],
    ["postgresql://u@x:p@127.0.0.1:55433/finance_test", /userinfo must not contain/],
    ["postgresql://u,x:p@127.0.0.1:55433/finance_test", /userinfo must not contain/],
    [`postgresql://${CREDS}@127.0.0.1:55433,db.evil.example/finance_test`, /not a valid URL/],
    [`postgresql://${CREDS}@127.0.0.1%2Cdb.evil.example/finance_test`, /host must be loopback/],
    [`postgresql://${CREDS}@%31%32%37.0.0.1/finance_test`, /host must be loopback/],
    [`postgresql://${CREDS}@127.0.0.1:55433/finance%5Ftest`, /must not contain "%"/],
    [`postgresql://${CREDS}@127.0.0.1:55433/prod%2Fx_test`, /must not contain "%"/],
    [`postgresql://${CREDS}@127.0.0.1:55433/finance_test%00`, /must not contain "%"/],
    [`postgresql://${CREDS}@127.0.0.1:55433/finance_test?`, /query parameters/],
    [`postgresql://${CREDS}@127.0.0.1:55433/fin ance_test`, /whitespace or control/],
    [`postgresql://${CREDS}@127.0.0.1\t.evil.example/finance_test`, /whitespace or control/],
    ["mysql://root@127.0.0.1/finance_test", /unsupported protocol/],
    ["not a url", /not a valid URL/],
  ])("rejects %s", (url, message) => {
    expect(() => assertSafeTestDatabaseUrl(url)).toThrow(message);
  });
});
