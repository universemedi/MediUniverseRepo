import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import ReactSelect from "react-select";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { apiFetchPublic, ApiError } from "@/lib/api";
import type { OrgTypeApiDto } from "@/lib/types";
import { storeSignupSession, type SignupResult } from "@/lib/signupSession";
import { fetchIndiaCities, useIndiaStates } from "@/lib/indiaLocations";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubscribeSearch {
  plan?: string | undefined;
}

export const Route = createFileRoute("/subscribe/")({
  validateSearch: (search: Record<string, unknown>): SubscribeSearch => ({
    plan: typeof search["plan"] === "string" ? (search["plan"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create Your Account — MediUnivers" },
      {
        name: "description",
        content:
          "Create your organization account, then choose and pay for a plan — no sales call required.",
      },
    ],
  }),
  component: CreateAccountPage,
});

const Required = () => <span className="font-bold text-destructive"> *</span>;

interface FieldErrors {
  organizationName?: string;
  orgTypeCode?: string;
  headBranchName?: string;
  ownerFullName?: string;
  ownerEmail?: string;
}

function CreateAccountPage() {
  const { plan: preselectedPlan } = Route.useSearch();
  const navigate = useNavigate();

  const [orgTypes, setOrgTypes] = useState<OrgTypeApiDto[] | null>(null);
  const [orgTypesError, setOrgTypesError] = useState<string | null>(null);

  const [organizationName, setOrganizationName] = useState("");
  const [orgTypeCode, setOrgTypeCode] = useState("");
  const [headBranchName, setHeadBranchName] = useState("Head Office");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const states = useIndiaStates();
  const [subdomain, setSubdomain] = useState("");

  useEffect(() => {
    if (!state) {
      setCityOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    fetchIndiaCities(state)
      .then((cities) => {
        if (!cancelled) setCityOptions(cities);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const refs = {
    organizationName: useRef<HTMLInputElement>(null),
    headBranchName: useRef<HTMLInputElement>(null),
    ownerFullName: useRef<HTMLInputElement>(null),
    ownerEmail: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    apiFetchPublic<OrgTypeApiDto[]>("/api/public/org-types")
      .then((types) => {
        setOrgTypes(types);
        setOrgTypeCode((prev) => prev || (types[0]?.code ?? ""));
      })
      .catch(() =>
        setOrgTypesError("Couldn't load organization types. Please refresh and try again."),
      );
  }, []);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!organizationName.trim()) next.organizationName = "Organization name is required.";
    if (!orgTypeCode) next.orgTypeCode = "Please choose an organization type.";
    if (!headBranchName.trim()) next.headBranchName = "Head office / main branch name is required.";
    if (!ownerFullName.trim()) next.ownerFullName = "Your full name is required.";
    if (!ownerEmail.trim()) {
      next.ownerEmail = "Work email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      next.ownerEmail = "Enter a valid email address.";
    }
    return next;
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    const firstInvalid = (Object.keys(fieldErrors) as (keyof FieldErrors)[])[0];
    if (firstInvalid) {
      const ref = firstInvalid in refs ? refs[firstInvalid as keyof typeof refs] : undefined;
      ref?.current?.focus();
      ref?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await apiFetchPublic<SignupResult>(
        "/api/public/organizations/create-account",
        {
          method: "POST",
          data: {
            organizationName: organizationName.trim(),
            subdomain: subdomain.trim() || null,
            orgTypeCode,
            phone: phone.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
            country: "India",
            gstNumber: gstNumber.trim() || null,
            headBranchName: headBranchName.trim(),
            ownerFullName: ownerFullName.trim(),
            ownerEmail: ownerEmail.trim(),
          },
        },
      );
      storeSignupSession(result, preselectedPlan);
      await navigate({ to: "/subscribe/plans" });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Couldn't create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Step 1 of 2"
        title="Create your organization account"
        subtitle="Tell us about your organization and yourself. You'll choose and pay for a plan next."
      />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleCreateAccount} noValidate>
            <h2 className="text-lg font-semibold text-foreground">Organization details</h2>
            <p className="text-xs text-muted-foreground">
              Fields marked <span className="font-bold text-destructive">*</span> are required.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-org">
                  Organization name
                  <Required />
                </Label>
                <Input
                  id="s-org"
                  ref={refs.organizationName}
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className={cn(errors.organizationName && "border-destructive")}
                />
                {errors.organizationName ? (
                  <p className="text-xs text-destructive">{errors.organizationName}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Organization type
                  <Required />
                </Label>
                {orgTypesError ? (
                  <p className="text-xs text-destructive">{orgTypesError}</p>
                ) : !orgTypes ? (
                  <Skeleton className="h-9 rounded-md" />
                ) : (
                  <Select value={orgTypeCode} onValueChange={setOrgTypeCode}>
                    <SelectTrigger className={cn(errors.orgTypeCode && "border-destructive")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orgTypes.map((t) => (
                        <SelectItem key={t.code} value={t.code}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.orgTypeCode ? (
                  <p className="text-xs text-destructive">{errors.orgTypeCode}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-branch">
                  Head office / main branch name
                  <Required />
                </Label>
                <Input
                  id="s-branch"
                  ref={refs.headBranchName}
                  value={headBranchName}
                  onChange={(e) => setHeadBranchName(e.target.value)}
                  className={cn(errors.headBranchName && "border-destructive")}
                />
                {errors.headBranchName ? (
                  <p className="text-xs text-destructive">{errors.headBranchName}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-owner">
                  Your full name
                  <Required />
                </Label>
                <Input
                  id="s-owner"
                  ref={refs.ownerFullName}
                  value={ownerFullName}
                  onChange={(e) => setOwnerFullName(e.target.value)}
                  className={cn(errors.ownerFullName && "border-destructive")}
                />
                {errors.ownerFullName ? (
                  <p className="text-xs text-destructive">{errors.ownerFullName}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">
                  Work email (used to sign in)
                  <Required />
                </Label>
                <Input
                  id="s-email"
                  ref={refs.ownerEmail}
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className={cn(errors.ownerEmail && "border-destructive")}
                />
                {errors.ownerEmail ? (
                  <p className="text-xs text-destructive">{errors.ownerEmail}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Phone</Label>
                <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-state">State</Label>
                <ReactSelect
                  inputId="s-state"
                  instanceId="s-state"
                  isSearchable
                  options={states.map((s) => ({ label: s, value: s }))}
                  value={state ? { label: state, value: state } : null}
                  onChange={(opt) => {
                    setState(opt?.value ?? "");
                    setCity("");
                  }}
                  placeholder="Select state"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-city">City</Label>
                <ReactSelect
                  inputId="s-city"
                  instanceId="s-city"
                  isSearchable
                  isDisabled={!state}
                  isLoading={loadingCities}
                  options={cityOptions.map((c) => ({ label: c, value: c }))}
                  value={city ? { label: city, value: city } : null}
                  onChange={(opt) => setCity(opt?.value ?? "")}
                  placeholder={state ? "Select city" : "Select a state first"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-gst">GST number (optional)</Label>
                <Input
                  id="s-gst"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-subdomain">Preferred subdomain</Label>
                <Input
                  id="s-subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="nairclinic"
                />
              </div>
            </div>

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…
                </>
              ) : (
                "Continue to choose a plan"
              )}
            </Button>
          </form>
        </Card>
      </section>
    </SiteLayout>
  );
}
