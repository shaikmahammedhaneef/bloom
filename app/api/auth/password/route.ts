import bcrypt from "bcryptjs";
import { User } from "@/models";
import { passwordProblem } from "@/lib/passwordReset";
import { HttpError, ok, readBody, withUser } from "@/lib/server";

// Changes the password of the signed-in user, after checking the current one.
export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    const problem = passwordProblem(b.next);
    if (problem) throw new HttpError(400, problem);
    const user = await User.findById(uid);
    if (!user) throw new HttpError(404, "Account not found.");
    if (typeof b.current !== "string" || !(await bcrypt.compare(b.current, user.passwordHash))) {
      throw new HttpError(400, "Your current password isn't right.");
    }
    user.passwordHash = await bcrypt.hash(b.next as string, 10);
    await user.save();
    return ok({ ok: true });
  });
}
